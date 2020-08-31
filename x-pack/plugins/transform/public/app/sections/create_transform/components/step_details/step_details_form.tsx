/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiLink, EuiSwitch, EuiFieldText, EuiForm, EuiFormRow, EuiSelect } from '@elastic/eui';

import { KBN_FIELD_TYPES } from '../../../../../../../../../src/plugins/data/common';

import { toMountPoint } from '../../../../../../../../../src/plugins/kibana_react/public';
import { TransformId } from '../../../../../../common';
import { isValidIndexName } from '../../../../../../common/utils/es_utils';

import { getErrorMessage } from '../../../../../shared_imports';

import { useAppDependencies, useToastNotifications } from '../../../../app_dependencies';
import { ToastNotificationText } from '../../../../components';
import { useDocumentationLinks } from '../../../../hooks/use_documentation_links';
import { SearchItems } from '../../../../hooks/use_search_items';
import { useApi } from '../../../../hooks/use_api';
import { StepDetailsTimeField } from './step_details_time_field';
import {
  getPivotQuery,
  getPreviewRequestBody,
  isTransformIdValid,
  TransformPivotConfig,
} from '../../../../common';
import { EsIndexName, IndexPatternTitle } from './common';
import { delayValidator } from '../../../../common/validators';
import { StepDefineExposedState } from '../step_define/common';
import { dictionaryToArray } from '../../../../../../common/types/common';

export interface StepDetailsExposedState {
  continuousModeDateField: string;
  continuousModeDelay: string;
  createIndexPattern: boolean;
  destinationIndex: EsIndexName;
  isContinuousModeEnabled: boolean;
  touched: boolean;
  transformId: TransformId;
  transformDescription: string;
  valid: boolean;
  indexPatternDateField?: string | undefined;
}

export function getDefaultStepDetailsState(): StepDetailsExposedState {
  return {
    continuousModeDateField: '',
    continuousModeDelay: '60s',
    createIndexPattern: true,
    isContinuousModeEnabled: false,
    transformId: '',
    transformDescription: '',
    destinationIndex: '',
    touched: false,
    valid: false,
    indexPatternDateField: undefined,
  };
}

export function applyTransformConfigToDetailsState(
  state: StepDetailsExposedState,
  transformConfig?: TransformPivotConfig
): StepDetailsExposedState {
  // apply the transform configuration to wizard DETAILS state
  if (transformConfig !== undefined) {
    const time = transformConfig.sync?.time;
    if (time !== undefined) {
      state.continuousModeDateField = time.field;
      state.continuousModeDelay = time.delay;
      state.isContinuousModeEnabled = true;
    }
  }
  return state;
}

interface Props {
  overrides?: StepDetailsExposedState;
  onChange(s: StepDetailsExposedState): void;
  searchItems: SearchItems;
  stepDefineState: StepDefineExposedState;
}

export const StepDetailsForm: FC<Props> = React.memo(
  ({ overrides = {}, onChange, searchItems, stepDefineState }) => {
    const deps = useAppDependencies();
    const toastNotifications = useToastNotifications();
    const { esIndicesCreateIndex } = useDocumentationLinks();

    const defaults = { ...getDefaultStepDetailsState(), ...overrides };

    const [transformId, setTransformId] = useState<TransformId>(defaults.transformId);
    const [transformDescription, setTransformDescription] = useState<string>(
      defaults.transformDescription
    );
    const [destinationIndex, setDestinationIndex] = useState<EsIndexName>(
      defaults.destinationIndex
    );
    const [transformIds, setTransformIds] = useState<TransformId[]>([]);
    const [indexNames, setIndexNames] = useState<EsIndexName[]>([]);

    // Index pattern state
    const [indexPatternTitles, setIndexPatternTitles] = useState<IndexPatternTitle[]>([]);
    const [createIndexPattern, setCreateIndexPattern] = useState(defaults.createIndexPattern);
    const [previewDateColumns, setPreviewDateColumns] = useState<string[]>([]);
    const [indexPatternDateField, setIndexPatternDateField] = useState<string | undefined>();

    const onTimeFieldChanged = React.useCallback(
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        // If the value is an empty string, it's not a valid selection
        if (value === '') {
          return;
        }
        // Find the time field based on the selected value
        // this is to account for undefined when user chooses not to use a date field
        const timeField = previewDateColumns.find((col) => col === value);

        setIndexPatternDateField(timeField);
      },
      [setIndexPatternDateField, previewDateColumns]
    );

    // Continuous mode state
    const [isContinuousModeEnabled, setContinuousModeEnabled] = useState(
      defaults.isContinuousModeEnabled
    );

    const api = useApi();

    // fetch existing transform IDs and indices once for form validation
    useEffect(() => {
      // use an IIFE to avoid returning a Promise to useEffect.
      (async function () {
        try {
          const { searchQuery, groupByList, aggList } = stepDefineState;
          const pivotAggsArr = dictionaryToArray(aggList);
          const pivotGroupByArr = dictionaryToArray(groupByList);
          const pivotQuery = getPivotQuery(searchQuery);
          const previewRequest = getPreviewRequestBody(
            searchItems.indexPattern.title,
            pivotQuery,
            pivotGroupByArr,
            pivotAggsArr
          );

          const transformPreview = await api.getTransformsPreview(previewRequest);
          const properties = transformPreview.generated_dest_index.mappings.properties;
          const datetimeColumns: string[] = Object.keys(properties).filter(
            (col) => properties[col].type === 'date'
          );

          setPreviewDateColumns(datetimeColumns);
          setIndexPatternDateField(datetimeColumns[0]);
        } catch (e) {
          toastNotifications.addDanger({
            title: i18n.translate('xpack.transform.stepDetailsForm.errorGettingTransformPreview', {
              defaultMessage: 'An error occurred getting transform preview',
            }),
            text: toMountPoint(
              <ToastNotificationText overlays={deps.overlays} text={getErrorMessage(e)} />
            ),
          });
        }

        try {
          setTransformIds(
            (await api.getTransforms()).transforms.map(
              (transform: TransformPivotConfig) => transform.id
            )
          );
        } catch (e) {
          toastNotifications.addDanger({
            title: i18n.translate('xpack.transform.stepDetailsForm.errorGettingTransformList', {
              defaultMessage: 'An error occurred getting the existing transform IDs:',
            }),
            text: toMountPoint(
              <ToastNotificationText overlays={deps.overlays} text={getErrorMessage(e)} />
            ),
          });
        }

        try {
          setIndexNames((await api.getIndices()).map((index) => index.name));
        } catch (e) {
          toastNotifications.addDanger({
            title: i18n.translate('xpack.transform.stepDetailsForm.errorGettingIndexNames', {
              defaultMessage: 'An error occurred getting the existing index names:',
            }),
            text: toMountPoint(
              <ToastNotificationText overlays={deps.overlays} text={getErrorMessage(e)} />
            ),
          });
        }

        try {
          setIndexPatternTitles(await deps.data.indexPatterns.getTitles());
        } catch (e) {
          toastNotifications.addDanger({
            title: i18n.translate(
              'xpack.transform.stepDetailsForm.errorGettingIndexPatternTitles',
              {
                defaultMessage: 'An error occurred getting the existing index pattern titles:',
              }
            ),
            text: toMountPoint(
              <ToastNotificationText overlays={deps.overlays} text={getErrorMessage(e)} />
            ),
          });
        }
      })();
      // run once
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const dateFieldNames = searchItems.indexPattern.fields
      .filter((f) => f.type === KBN_FIELD_TYPES.DATE)
      .map((f) => f.name)
      .sort();
    const isContinuousModeAvailable = dateFieldNames.length > 0;
    const [continuousModeDateField, setContinuousModeDateField] = useState(
      isContinuousModeAvailable ? dateFieldNames[0] : ''
    );
    const [continuousModeDelay, setContinuousModeDelay] = useState(defaults.continuousModeDelay);
    const isContinuousModeDelayValid = delayValidator(continuousModeDelay);

    const transformIdExists = transformIds.some((id) => transformId === id);
    const transformIdEmpty = transformId === '';
    const transformIdValid = isTransformIdValid(transformId);

    const indexNameExists = indexNames.some((name) => destinationIndex === name);
    const indexNameEmpty = destinationIndex === '';
    const indexNameValid = isValidIndexName(destinationIndex);
    const indexPatternTitleExists = indexPatternTitles.some((name) => destinationIndex === name);

    const valid =
      !transformIdEmpty &&
      transformIdValid &&
      !transformIdExists &&
      !indexNameEmpty &&
      indexNameValid &&
      (!indexPatternTitleExists || !createIndexPattern) &&
      (!isContinuousModeAvailable || (isContinuousModeAvailable && isContinuousModeDelayValid));

    // expose state to wizard
    useEffect(() => {
      onChange({
        continuousModeDateField,
        continuousModeDelay,
        createIndexPattern,
        isContinuousModeEnabled,
        transformId,
        transformDescription,
        destinationIndex,
        touched: true,
        valid,
        indexPatternDateField,
      });
      // custom comparison
      /* eslint-disable react-hooks/exhaustive-deps */
    }, [
      continuousModeDateField,
      continuousModeDelay,
      createIndexPattern,
      isContinuousModeEnabled,
      transformId,
      transformDescription,
      destinationIndex,
      valid,
      indexPatternDateField,
      /* eslint-enable react-hooks/exhaustive-deps */
    ]);

    return (
      <div data-test-subj="transformStepDetailsForm">
        <EuiForm>
          <EuiFormRow
            label={i18n.translate('xpack.transform.stepDetailsForm.transformIdLabel', {
              defaultMessage: 'Transform ID',
            })}
            isInvalid={(!transformIdEmpty && !transformIdValid) || transformIdExists}
            error={[
              ...(!transformIdEmpty && !transformIdValid
                ? [
                    i18n.translate('xpack.transform.stepDetailsForm.transformIdInvalidError', {
                      defaultMessage:
                        'Must contain lowercase alphanumeric characters (a-z and 0-9), hyphens, and underscores only and must start and end with alphanumeric characters.',
                    }),
                  ]
                : []),
              ...(transformIdExists
                ? [
                    i18n.translate('xpack.transform.stepDetailsForm.transformIdExistsError', {
                      defaultMessage: 'A transform with this ID already exists.',
                    }),
                  ]
                : []),
            ]}
          >
            <EuiFieldText
              value={transformId}
              onChange={(e) => setTransformId(e.target.value)}
              aria-label={i18n.translate(
                'xpack.transform.stepDetailsForm.transformIdInputAriaLabel',
                {
                  defaultMessage: 'Choose a unique transform ID.',
                }
              )}
              isInvalid={(!transformIdEmpty && !transformIdValid) || transformIdExists}
              data-test-subj="transformIdInput"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.transform.stepDetailsForm.transformDescriptionLabel', {
              defaultMessage: 'Transform description',
            })}
          >
            <EuiFieldText
              placeholder={i18n.translate(
                'xpack.transform.stepDetailsForm.transformDescriptionPlaceholderText',
                { defaultMessage: 'Description (optional)' }
              )}
              value={transformDescription}
              onChange={(e) => setTransformDescription(e.target.value)}
              aria-label={i18n.translate(
                'xpack.transform.stepDetailsForm.transformDescriptionInputAriaLabel',
                {
                  defaultMessage: 'Choose an optional transform description.',
                }
              )}
              data-test-subj="transformDescriptionInput"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.transform.stepDetailsForm.destinationIndexLabel', {
              defaultMessage: 'Destination index',
            })}
            isInvalid={!indexNameEmpty && !indexNameValid}
            helpText={
              indexNameExists &&
              i18n.translate('xpack.transform.stepDetailsForm.destinationIndexHelpText', {
                defaultMessage:
                  'An index with this name already exists. Be aware that running this transform will modify this destination index.',
              })
            }
            error={
              !indexNameEmpty &&
              !indexNameValid && [
                <Fragment>
                  {i18n.translate('xpack.transform.stepDetailsForm.destinationIndexInvalidError', {
                    defaultMessage: 'Invalid destination index name.',
                  })}
                  <br />
                  <EuiLink href={esIndicesCreateIndex} target="_blank">
                    {i18n.translate(
                      'xpack.transform.stepDetailsForm.destinationIndexInvalidErrorLink',
                      {
                        defaultMessage: 'Learn more about index name limitations.',
                      }
                    )}
                  </EuiLink>
                </Fragment>,
              ]
            }
          >
            <EuiFieldText
              value={destinationIndex}
              onChange={(e) => setDestinationIndex(e.target.value)}
              aria-label={i18n.translate(
                'xpack.transform.stepDetailsForm.destinationIndexInputAriaLabel',
                {
                  defaultMessage: 'Choose a unique destination index name.',
                }
              )}
              isInvalid={!indexNameEmpty && !indexNameValid}
              data-test-subj="transformDestinationIndexInput"
            />
          </EuiFormRow>

          <EuiFormRow
            isInvalid={createIndexPattern && indexPatternTitleExists}
            error={
              createIndexPattern &&
              indexPatternTitleExists && [
                i18n.translate('xpack.transform.stepDetailsForm.indexPatternTitleError', {
                  defaultMessage: 'An index pattern with this title already exists.',
                }),
              ]
            }
          >
            <EuiSwitch
              name="transformCreateIndexPattern"
              label={i18n.translate('xpack.transform.stepCreateForm.createIndexPatternLabel', {
                defaultMessage: 'Create index pattern',
              })}
              checked={createIndexPattern === true}
              onChange={() => setCreateIndexPattern(!createIndexPattern)}
              data-test-subj="transformCreateIndexPatternSwitch"
            />
          </EuiFormRow>
          {createIndexPattern && !indexPatternTitleExists && previewDateColumns.length > 0 && (
            <StepDetailsTimeField
              previewDateColumns={previewDateColumns}
              indexPatternDateField={indexPatternDateField}
              onTimeFieldChanged={onTimeFieldChanged}
            />
          )}
          <EuiFormRow
            helpText={
              isContinuousModeAvailable === false
                ? i18n.translate('xpack.transform.stepDetailsForm.continuousModeError', {
                    defaultMessage:
                      'Continuous mode is not available for indices without date fields.',
                  })
                : ''
            }
          >
            <EuiSwitch
              name="transformContinuousMode"
              label={i18n.translate('xpack.transform.stepCreateForm.continuousModeLabel', {
                defaultMessage: 'Continuous mode',
              })}
              checked={isContinuousModeEnabled === true}
              onChange={() => setContinuousModeEnabled(!isContinuousModeEnabled)}
              disabled={isContinuousModeAvailable === false}
              data-test-subj="transformContinuousModeSwitch"
            />
          </EuiFormRow>
          {isContinuousModeEnabled && (
            <Fragment>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.transform.stepDetailsForm.continuousModeDateFieldLabel',
                  {
                    defaultMessage: 'Date field',
                  }
                )}
                helpText={i18n.translate(
                  'xpack.transform.stepDetailsForm.continuousModeDateFieldHelpText',
                  {
                    defaultMessage:
                      'Select the date field that can be used to identify new documents.',
                  }
                )}
              >
                <EuiSelect
                  options={dateFieldNames.map((text: string) => ({ text }))}
                  value={continuousModeDateField}
                  onChange={(e) => setContinuousModeDateField(e.target.value)}
                  data-test-subj="transformContinuousDateFieldSelect"
                />
              </EuiFormRow>
              <EuiFormRow
                label={i18n.translate('xpack.transform.stepDetailsForm.continuousModeDelayLabel', {
                  defaultMessage: 'Delay',
                })}
                isInvalid={!isContinuousModeDelayValid}
                error={
                  !isContinuousModeDelayValid && [
                    i18n.translate('xpack.transform.stepDetailsForm.continuousModeDelayError', {
                      defaultMessage: 'Invalid delay format',
                    }),
                  ]
                }
                helpText={i18n.translate(
                  'xpack.transform.stepDetailsForm.continuousModeDelayHelpText',
                  {
                    defaultMessage: 'Time delay between current time and latest input data time.',
                  }
                )}
              >
                <EuiFieldText
                  placeholder="delay"
                  value={continuousModeDelay}
                  onChange={(e) => setContinuousModeDelay(e.target.value)}
                  aria-label={i18n.translate(
                    'xpack.transform.stepDetailsForm.continuousModeAriaLabel',
                    {
                      defaultMessage: 'Choose a delay.',
                    }
                  )}
                  isInvalid={!isContinuousModeDelayValid}
                  data-test-subj="transformContinuousDelayInput"
                />
              </EuiFormRow>
            </Fragment>
          )}
        </EuiForm>
      </div>
    );
  }
);
