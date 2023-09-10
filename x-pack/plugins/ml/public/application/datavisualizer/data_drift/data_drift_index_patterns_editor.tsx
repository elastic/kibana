/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexItem,
  EuiFieldText,
  EuiFormRow,
  EuiFlexGroup,
  EuiComboBoxOptionOption,
  EuiComboBox,
  EuiSteps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useObservable from 'react-use/lib/useObservable';
import { combineLatest, map, Observable } from 'rxjs';
import { intersectionBy } from 'lodash';
import { type DataViewEditorService } from '@kbn/data-view-editor-plugin/public';
import { ML_PAGES } from '../../../../common/constants/locator';
import { useMlKibana, useMlLocator, useNavigateToPath } from '../../contexts/kibana';
import { DataViewEditor } from './data_view_editor';

export const matchedIndicesDefault = {
  allIndices: [],
  exactMatchedIndices: [],
  partialMatchedIndices: [],
  visibleIndices: [],
};

export interface TimestampOption {
  display: string;
  fieldName?: string;
}

export const canAppendWildcard = (keyPressed: string) => {
  // If it's not a letter, number or is something longer, reject it
  if (!keyPressed || !/[a-z0-9]/i.test(keyPressed) || keyPressed.length !== 1) {
    return false;
  }
  return true;
};

type DataViewEditorServiceSpec = DataViewEditorService;
const getDefaultIndexPattern = (referenceIndexPattern: string, productionIndexPattern: string) =>
  referenceIndexPattern === productionIndexPattern
    ? referenceIndexPattern
    : `${referenceIndexPattern},${productionIndexPattern}`;

export function DataDriftIndexPatternsEditor({
  referenceDataViewEditorService,
  productionDataViewEditorService,
  initialReferenceIndexPattern,
  initialProductionIndexPattern,
}: {
  referenceDataViewEditorService: DataViewEditorServiceSpec;
  productionDataViewEditorService: DataViewEditorServiceSpec;
  initialReferenceIndexPattern?: string;
  initialProductionIndexPattern?: string;
}) {
  const {
    services: {
      dataViewEditor,
      data: { dataViews },
    },
  } = useMlKibana();
  const locator = useMlLocator()!;
  const canEditDataView = dataViewEditor?.userPermissions.editDataView();
  const [timeField, setTimeField] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [dataViewName, setDataViewName] = useState<string>('');
  const [dataViewMsg, setDataViewMsg] = useState<string | undefined>();
  const [foundDataViewId, setFoundDataViewId] = useState<string | undefined>();
  const [refError, setRefError] = useState<string | undefined>();
  const [comparisonError, setComparisonError] = useState<string | undefined>();

  // For the purpose of data drift, the two datasets need to have the same common timestamp field if they exist
  // In data view management, creating a data view provides union of all the timestamp fields
  // Here, we need the intersection of two sets instead
  const combinedTimeFieldOptions$: Observable<Array<EuiComboBoxOptionOption<string>>> =
    useMemo(() => {
      return combineLatest([
        referenceDataViewEditorService?.timestampFieldOptions$,
        productionDataViewEditorService?.timestampFieldOptions$,
      ]).pipe(
        map(([referenceTimeFieldOptions, productionTimeFieldOptions]) => {
          const intersectedTimeFields = intersectionBy<TimestampOption, TimestampOption>(
            referenceTimeFieldOptions,
            productionTimeFieldOptions,
            (d) => d.fieldName
          ).map(({ display, fieldName }) => ({
            label: display,
            value: fieldName,
          }));

          return intersectedTimeFields;
        })
      );
    }, [productionDataViewEditorService, referenceDataViewEditorService]);

  const combinedTimeFieldOptions = useObservable(combinedTimeFieldOptions$, []);

  const [referenceIndexPattern, setReferenceIndexPattern] = useState<string>(
    initialReferenceIndexPattern ?? ''
  );
  const [productionIndexPattern, setProductionIndexPattern] = useState<string>(
    initialProductionIndexPattern ?? ''
  );

  const navigateToPath = useNavigateToPath();

  useEffect(() => {
    let unmounted = false;
    const getMatchingDataView = async () => {
      setDataViewMsg(undefined);
      setFoundDataViewId(undefined);
      if (!unmounted && referenceIndexPattern && productionIndexPattern) {
        const indicesName = getDefaultIndexPattern(referenceIndexPattern, productionIndexPattern);

        const matchingDataViews = await dataViews.find(indicesName);

        const timeFieldName =
          Array.isArray(timeField) && timeField.length > 0 && timeField[0].value !== ''
            ? timeField[0].value
            : undefined;

        if (Array.isArray(matchingDataViews) && matchingDataViews.length > 0) {
          const foundDataView = matchingDataViews.find((d) => {
            return d.timeFieldName === timeFieldName;
          });

          if (foundDataView) {
            setFoundDataViewId(foundDataView.id);
          } else {
            setDataViewMsg(
              i18n.translate(
                'xpack.ml.dataDrift.indexPatternsEditor.hasDataViewWithDifferentTimeField',
                {
                  defaultMessage: `Found a data view matching pattern '{indexPattern}' but with a different time field. Creating a new data view to analyze data drift.`,
                  values: { indexPattern: indicesName },
                }
              )
            );
          }
        }
      }
    };

    getMatchingDataView();

    return () => {
      unmounted = true;
    };
  }, [referenceIndexPattern, productionIndexPattern, timeField, dataViews]);
  const createDataViewAndRedirectToDataDriftPage = async (createAdHocDV = false) => {
    // Create adhoc data view
    const indicesName = getDefaultIndexPattern(referenceIndexPattern, productionIndexPattern);

    const timeFieldName =
      Array.isArray(timeField) && timeField.length > 0 ? timeField[0].value : undefined;

    let dataView;

    if (!foundDataViewId) {
      const defaultDataViewName =
        dataViewMsg === undefined
          ? indicesName
          : `${indicesName}${timeFieldName ? '-' + timeFieldName : ''}`;

      const modifiedDataViewName = dataViewName === '' ? defaultDataViewName : dataViewName;
      if (canEditDataView && createAdHocDV === false) {
        dataView = await dataViews.createAndSave({
          title: indicesName,
          name: modifiedDataViewName,
          timeFieldName,
        });
      } else {
        dataView = await dataViews.create({
          title: indicesName,
          name: modifiedDataViewName,
          timeFieldName,
        });
      }
    }
    const dataViewId = foundDataViewId ?? dataView?.id;
    const url = await locator.getUrl({
      page: ML_PAGES.DATA_DRIFT,
      pageState: {
        index: dataViewId,
        reference: referenceIndexPattern,
        production: productionIndexPattern,
        timeFieldName,
      },
    });

    await navigateToPath(url);
  };

  const hasError =
    refError !== undefined ||
    comparisonError !== undefined ||
    !productionIndexPattern ||
    !referenceIndexPattern;

  const firstSetOfSteps = [
    {
      title: 'Pick index pattern for reference data',
      children: (
        <EuiFlexItem grow={false}>
          <DataViewEditor
            key={'reference'}
            label={
              <FormattedMessage
                id="xpack.ml.dataDrift.indexPatternsEditor.referenceData"
                defaultMessage="Select an index pattern to specify the reference data."
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.ml.dataDrift.indexPatternsEditor.requireSameTimeFieldHelpText"
                defaultMessage="To view the changes in the data over time, reference and comparison data can have different index patterns, but they must have the same time field."
              />
            }
            dataViewEditorService={referenceDataViewEditorService}
            indexPattern={referenceIndexPattern}
            setIndexPattern={setReferenceIndexPattern}
            onError={setRefError}
          />
        </EuiFlexItem>
      ),
    },
    {
      title: 'Pick index pattern for comparison data',
      children: (
        <EuiFlexItem grow={false}>
          <DataViewEditor
            key={'comparison'}
            label={
              <FormattedMessage
                id="xpack.ml.dataDrift.indexPatternsEditor.comparisonData"
                defaultMessage="Select an index pattern to specify the comparison data"
              />
            }
            helpText={
              <FormattedMessage
                id="xpack.ml.dataDrift.indexPatternsEditor.requireSameTimeFieldHelpText"
                defaultMessage="To view the changes in the data over time, reference and comparison data can have different index patterns, but they must have the same time field."
              />
            }
            dataViewEditorService={productionDataViewEditorService}
            indexPattern={productionIndexPattern}
            setIndexPattern={setProductionIndexPattern}
            onError={setComparisonError}
          />
        </EuiFlexItem>
      ),
    },
    {
      title: 'Additional settings',
      children: (
        <EuiFlexGroup direction="column">
          {combinedTimeFieldOptions.length > 0 ? (
            <EuiFormRow
              label={i18n.translate('xpack.ml.dataDrift.indexPatternsEditor.timestampFieldLabel', {
                defaultMessage: 'Timestamp field',
              })}
              fullWidth
              color={'disabled'}
            >
              <>
                <EuiComboBox<string>
                  placeholder={i18n.translate(
                    'xpack.ml.dataDrift.indexPatternsEditor.timestampFieldOptions',
                    {
                      defaultMessage: 'Select an optional timestamp field',
                    }
                  )}
                  singleSelection={{ asPlainText: true }}
                  options={combinedTimeFieldOptions}
                  selectedOptions={timeField}
                  onChange={(newValue) => {
                    if (newValue.length === 0) {
                      // Don't allow clearing the type. One must always be selected
                      return;
                    }
                    setTimeField(newValue);
                  }}
                  isClearable={false}
                  isDisabled={productionIndexPattern === '' && referenceIndexPattern === ''}
                  data-test-subj="timestampField"
                  aria-label={i18n.translate(
                    'xpack.ml.dataDrift.indexPatternsEditor.timestampSelectAriaLabel',
                    {
                      defaultMessage: 'Timestamp field',
                    }
                  )}
                  fullWidth
                />
              </>
            </EuiFormRow>
          ) : null}
          {!foundDataViewId ? (
            <EuiFormRow
              label={i18n.translate('xpack.ml.dataDrift.indexPatternsEditor.dataViewName', {
                defaultMessage: 'Data view name',
              })}
              helpText={
                i18n.translate('xpack.ml.dataDrift.indexPatternsEditor.dataViewHelpText', {
                  defaultMessage: 'Optional data view name.',
                }) +
                (referenceIndexPattern && productionIndexPattern
                  ? ` ${i18n.translate(
                      'xpack.ml.dataDrift.indexPatternsEditor.defaultDataViewHelpText',
                      {
                        defaultMessage: 'Default to {fallbackDataViewName} if not set.',
                        values: {
                          fallbackDataViewName: getDefaultIndexPattern(
                            referenceIndexPattern,
                            productionIndexPattern
                          ),
                        },
                      }
                    )}`
                  : '')
              }
              fullWidth
            >
              <EuiFieldText
                value={dataViewName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setDataViewName(e.target.value);
                }}
                fullWidth
                data-test-subj="dataDriftDataViewNameInput"
              />
            </EuiFormRow>
          ) : null}

          {dataViewMsg ? <EuiCallOut color="primary">{dataViewMsg}</EuiCallOut> : null}

          <EuiFormRow id="analyzeDriftData">
            <EuiFlexGroup>
              {canEditDataView && foundDataViewId === undefined ? (
                <EuiFlexItem>
                  <EuiButton
                    color="primary"
                    disabled={hasError}
                    onClick={createDataViewAndRedirectToDataDriftPage.bind(null, true)}
                    iconType="visTagCloud"
                    data-test-subj="analyzeDataDriftButton"
                    aria-label={i18n.translate(
                      'xpack.ml.dataDrift.indexPatternsEditor.analyzeDataDriftWithoutSavingLabel',
                      {
                        defaultMessage: 'Analyze data drift without saving',
                      }
                    )}
                  >
                    <FormattedMessage
                      id="xpack.ml.dataDrift.indexPatternsEditor.analyzeDataDriftWithoutSavingLabel"
                      defaultMessage="Analyze data drift without saving"
                    />
                  </EuiButton>
                </EuiFlexItem>
              ) : null}

              <EuiFlexItem>
                <EuiButton
                  disabled={hasError}
                  fill
                  onClick={createDataViewAndRedirectToDataDriftPage.bind(null, false)}
                  iconType="visTagCloud"
                  data-test-subj="analyzeDataDriftButton"
                  aria-label={i18n.translate(
                    'xpack.ml.dataDrift.indexPatternsEditor.analyzeDataDriftLabel',
                    {
                      defaultMessage: 'Analyze data drift',
                    }
                  )}
                >
                  <FormattedMessage
                    id="xpack.ml.dataDrift.indexPatternsEditor.analyzeDataDriftLabel"
                    defaultMessage="Analyze data drift"
                  />
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlexGroup>
      ),
    },
  ];

  return <EuiSteps steps={firstSetOfSteps} />;
}
