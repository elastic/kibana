/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiExpression,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { useTriggersAndActionsUiDeps } from '../es_query/util';
import { DataViewOption } from '../es_query/types';

interface DataViewSelectPopoverProps {
  selectedDataViewTitle: string;
  onSelectDataView: (options: DataViewOption[]) => void;
}

export const DataViewSelectPopover: React.FunctionComponent<DataViewSelectPopoverProps> = ({
  selectedDataViewTitle,
  onSelectDataView,
}) => {
  const { data } = useTriggersAndActionsUiDeps();

  const [dataViewPopoverOpen, setDataViewPopoverOpen] = useState(false);
  const [dataViewOptions, setDataViewOptions] = useState<DataViewOption[]>();
  const selectedOption = useMemo(() => ({ label: selectedDataViewTitle }), [selectedDataViewTitle]);

  useEffect(() => {
    const initDataViews = async () => {
      const dataViewItems = await data.dataViews.getIdsWithTitle();
      setDataViewOptions(dataViewItems.map(({ id, title }) => ({ label: title, value: id })));
    };
    initDataViews();
  }, [data.dataViews]);

  const closeDataViewPopover = useCallback(() => setDataViewPopoverOpen(false), []);

  return (
    <EuiPopover
      id="dataViewPopover"
      button={
        <EuiExpression
          display="columns"
          data-test-subj="selectDataViewExpression"
          description={i18n.translate('xpack.stackAlerts.components.ui.alertParams.indexLabel', {
            defaultMessage: 'data view',
          })}
          value={selectedDataViewTitle}
          isActive={dataViewPopoverOpen}
          onClick={() => {
            setDataViewPopoverOpen(true);
          }}
          isInvalid={!selectedDataViewTitle}
        />
      }
      isOpen={dataViewPopoverOpen}
      closePopover={closeDataViewPopover}
      ownFocus
      anchorPosition="downLeft"
      zIndex={8000}
      display="block"
    >
      <div style={{ width: '450px' }}>
        <EuiPopoverTitle>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem>
              {i18n.translate('xpack.stackAlerts.components.ui.alertParams.dataViewButtonLabel', {
                defaultMessage: 'Data view',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj="closePopover"
                iconType="cross"
                color="danger"
                aria-label={i18n.translate(
                  'xpack.stackAlerts.components.ui.alertParams.closeDataViewPopoverLabel',
                  { defaultMessage: 'Close' }
                )}
                onClick={closeDataViewPopover}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPopoverTitle>
        <EuiFormRow id="indexSelectSearchBox" fullWidth>
          <EuiComboBox
            aria-label="Accessible screen reader label"
            placeholder="Select a single option"
            singleSelection={{ asPlainText: true }}
            options={dataViewOptions}
            selectedOptions={[selectedOption]}
            onChange={onSelectDataView}
          />
        </EuiFormRow>
      </div>
    </EuiPopover>
  );
};
