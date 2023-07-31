/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { INDEX_PATTERN_TYPE } from '@kbn/data-views-plugin/public';
import {
  EuiButton,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFormRow,
  EuiFlexGroup,
  EuiComboBoxOptionOption,
  EuiComboBox,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useObservable from 'react-use/lib/useObservable';
import { combineLatest, map, Observable } from 'rxjs';
import { intersectionBy } from 'lodash';
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

export function DataDriftIndexPatternsEditor({
  initialReferenceIndexPattern,
  initialProductionIndexPattern,
}: {
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
  const { dataViewEditorServiceFactory } = dataViewEditor;
  const canEditDataView = dataViewEditor?.userPermissions.editDataView();
  const [timeField, setTimeField] = useState<Array<EuiComboBoxOptionOption<string>>>([]);

  const referenceDataViewEditorService = useMemo(
    () =>
      dataViewEditorServiceFactory({
        initialValues: {
          name: '',
          type: INDEX_PATTERN_TYPE.DEFAULT,
          indexPattern: initialReferenceIndexPattern,
        },
        requireTimestampField: true,
      }),
    [dataViewEditorServiceFactory, initialReferenceIndexPattern]
  );

  const productionDataViewEditorService = useMemo(
    () =>
      dataViewEditorServiceFactory({
        initialValues: {
          name: '',
          type: INDEX_PATTERN_TYPE.DEFAULT,
          indexPattern: initialProductionIndexPattern,
        },
        requireTimestampField: true,
      }),
    [dataViewEditorServiceFactory, initialProductionIndexPattern]
  );

  const combinedTimeFieldOptions$: Observable<Array<EuiComboBoxOptionOption<string>>> =
    useMemo(() => {
      return combineLatest([
        referenceDataViewEditorService.timestampFieldOptions$,
        productionDataViewEditorService.timestampFieldOptions$,
      ]).pipe(
        map(([referenceTimeFieldOptions, productionTimeFieldOptions]) => {
          return intersectionBy<TimestampOption, TimestampOption>(
            referenceTimeFieldOptions,
            productionTimeFieldOptions,
            (d) => d.fieldName
          ).map(({ display, fieldName }) => ({
            label: display,
            value: fieldName,
          }));
        })
      );
    }, [referenceDataViewEditorService, productionDataViewEditorService]);

  const combinedTimeFieldError$: Observable<string | undefined> = useMemo(() => {
    return combineLatest([
      combinedTimeFieldOptions$,
      referenceDataViewEditorService.loadingTimestampFields$,
      productionDataViewEditorService.loadingTimestampFields$,
    ]).pipe(
      map(([options, isLoadingReference, isLoadingProduction]) => {
        if (!isLoadingProduction && !isLoadingProduction && options.length === 0) {
          return 'Both reference and production data sets must have at least one time field name in common. Try a different index pattern.';
        }
      })
    );
  }, [combinedTimeFieldOptions$, referenceDataViewEditorService, productionDataViewEditorService]);

  const combinedTimeFieldOptions = useObservable(combinedTimeFieldOptions$, []);

  const [referenceIndexPattern, setReferenceIndexPattern] = useState<string>(
    initialReferenceIndexPattern ?? ''
  );
  const [productionIndexPattern, setProductionIndexPattern] = useState<string>(
    initialProductionIndexPattern ?? ''
  );

  const navigateToPath = useNavigateToPath();

  const createDataViewAndRedirectToDataComparisonPage = async () => {
    // Create adhoc data view
    const indicesName = `${referenceIndexPattern},${productionIndexPattern}`;

    const matchingDataViews = await dataViews.find(indicesName);
    const timeFieldName = Array.isArray(timeField) ? timeField[0].value : undefined;

    let dataView;
    if (
      Array.isArray(matchingDataViews) &&
      matchingDataViews.length === 1 &&
      matchingDataViews[0].timeFieldName === timeFieldName
    ) {
      dataView = matchingDataViews[0];
    } else {
      if (canEditDataView) {
        dataView = await dataViews.createAndSave({
          title: indicesName,
          name: indicesName,
          timeFieldName,
        });
      } else {
        dataView = await dataViews.create({
          title: indicesName,
          name: indicesName,
          timeFieldName,
        });
      }
    }
    const dataViewId = dataView.id;
    const url = await locator.getUrl({
      page: ML_PAGES.DATA_COMPARISON,
      pageState: {
        index: dataViewId,
        reference: referenceIndexPattern,
        production: productionIndexPattern,
        timeFieldName,
      },
    });

    await navigateToPath(url);
  };

  const errorMessage = useObservable(combinedTimeFieldError$, undefined);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGrid className="fieldEditor__flyoutPanels" gutterSize="xl" columns={2}>
        <EuiFlexItem grow={false}>
          <DataViewEditor
            key={'reference'}
            label={
              <FormattedMessage
                id="xpack.ml.dataDrift.indexPatternsEditor.referenceData"
                defaultMessage="Index pattern for reference data indices"
              />
            }
            dataViewEditorService={referenceDataViewEditorService}
            indexPattern={referenceIndexPattern}
            setIndexPattern={setReferenceIndexPattern}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <DataViewEditor
            key={'production'}
            label={
              <FormattedMessage
                id="xpack.ml.dataDrift.indexPatternsEditor.productionData"
                defaultMessage="Index pattern for production data indices"
              />
            }
            dataViewEditorService={productionDataViewEditorService}
            indexPattern={productionIndexPattern}
            setIndexPattern={setProductionIndexPattern}
          />
        </EuiFlexItem>
      </EuiFlexGrid>
      <EuiFormRow
        label={'Time'}
        error={errorMessage}
        isInvalid={errorMessage !== undefined}
        fullWidth
      >
        <>
          <EuiComboBox<string>
            placeholder={i18n.translate('xpack.ml.dataDrift.indexPatternsEditor.placeholderLabel', {
              defaultMessage: 'Select a timestamp field',
            })}
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

      <EuiFormRow id="addControl">
        <EuiButton
          fill
          onClick={createDataViewAndRedirectToDataComparisonPage}
          iconType="plusInCircle"
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
      </EuiFormRow>
    </EuiFlexGroup>
  );
}
