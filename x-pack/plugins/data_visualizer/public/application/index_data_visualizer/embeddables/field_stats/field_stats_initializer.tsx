/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import {
  DataSourceTypeSelector,
  FieldStatsInitializerViewType,
} from './field_stats_initializer_view_type';
import type { ChangePointEmbeddableRuntimeState } from '../grid_embeddable/types';
import { useDataVisualizerKibana } from '../../../kibana_context';

export interface FieldStatsInitializerProps {
  initialInput?: Partial<ChangePointEmbeddableRuntimeState>;
  onCreate: (props: ChangePointEmbeddableRuntimeState) => void;
  onCancel: () => void;
}

export const FieldStatisticsInitializer: FC<FieldStatsInitializerProps> = ({
  initialInput,
  onCreate,
  onCancel,
}) => {
  const {
    unifiedSearch: {
      ui: { IndexPatternSelect },
    },
  } = useDataVisualizerKibana().services;

  const [dataViewId, setDataViewId] = useState(initialInput?.dataViewId ?? '');
  const [viewType, setViewType] = useState(
    initialInput?.viewType ?? FieldStatsInitializerViewType.DATA_VIEW
  );

  // const [formInput, setFormInput] = useState<FormControlsProps>(
  //   pick(initialInput ?? {}, [
  //     'fn',
  //     'metricField',
  //     'splitField',
  //     'maxSeriesToPlot',
  //     'partitions',
  //   ]) as FormControlsProps
  // );

  const [isFormValid, setIsFormValid] = useState(true);

  const updatedProps = useMemo(() => {
    const isEsqlMode = viewType === 'esql';
    const defaultTitle = 'Field statistics';
    return {
      viewType,
      isEsqlMode,
      title: defaultTitle,
      dataViewId,
    };
  }, [dataViewId, viewType]);

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2 id={'changePointConfig'}>
            <FormattedMessage
              id="xpack.dataVisualizer.fieldStatisticsDashboardPanel.modalTitle"
              defaultMessage="Field statistics configuration"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiForm>
          <DataSourceTypeSelector value={viewType} onChange={setViewType} />
          {viewType === 'dataview' ? (
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.dataVisualizer.fieldStatisticsDashboardPanel.dataViewLabel',
                {
                  defaultMessage: 'Data view',
                }
              )}
            >
              <IndexPatternSelect
                autoFocus={!dataViewId}
                fullWidth
                compressed
                indexPatternId={dataViewId}
                placeholder={i18n.translate(
                  'xpack.dataVisualizer.fieldStatisticsDashboardPanel.dataViewSelectorPlaceholder',
                  {
                    defaultMessage: 'Select data view',
                  }
                )}
                onChange={(newId) => {
                  setDataViewId(newId ?? '');
                }}
              />
            </EuiFormRow>
          ) : null}
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel} data-test-subj="fieldStatsInitializerCancelButton">
              <FormattedMessage
                id="xpack.dataVisualizer.fieldStatisticsDashboardPanel.setupModal.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="fieldStatsInitializerConfirmButton"
              isDisabled={!isFormValid || !dataViewId}
              onClick={onCreate.bind(null, updatedProps)}
              fill
            >
              <FormattedMessage
                id="xpack.dataVisualizer.fieldStatisticsDashboardPanel.setupModal.confirmButtonLabel"
                defaultMessage="Confirm"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
