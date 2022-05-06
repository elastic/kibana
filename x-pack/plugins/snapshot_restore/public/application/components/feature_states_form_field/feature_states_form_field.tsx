/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiFormRow,
  EuiSwitch,
  EuiIconTip,
  EuiComboBox,
  EuiComboBoxOptionOption,
} from '@elastic/eui';

import { useServices } from '../../app_context';
import { FEATURE_STATES_NONE_OPTION } from '../../../../common/constants';
import { SlmPolicyPayload, RestoreSettings } from '../../../../common/types';

export type FeaturesOption = EuiComboBoxOptionOption<string>;

interface Props {
  featuresOptions: FeaturesOption[];
  selectedOptions: FeaturesOption[];
  setSelectedOptions: (features: FeaturesOption[]) => void;
  onUpdateFormSettings: (
    arg: Partial<SlmPolicyPayload['config']> & Partial<RestoreSettings>
  ) => void;
  hasNoneOptionSelected: boolean;
  isLoadingFeatures?: boolean;
}

export const FeatureStatesFormField: FunctionComponent<Props> = ({
  isLoadingFeatures = false,
  featuresOptions,
  selectedOptions,
  setSelectedOptions,
  onUpdateFormSettings,
  hasNoneOptionSelected,
}) => {
  const { i18n } = useServices();

  const onChange = (selected: FeaturesOption[]) => {
    setSelectedOptions(selected);
    onUpdateFormSettings({
      featureStates: selected.map((option) => option.label),
    });
  };

  const onIncludeNoneSwitchChange = () => {
    if (!hasNoneOptionSelected) {
      setSelectedOptions([{ label: FEATURE_STATES_NONE_OPTION }]);
      onUpdateFormSettings({ featureStates: [FEATURE_STATES_NONE_OPTION] });
    } else {
      setSelectedOptions([]);
      onUpdateFormSettings({ featureStates: [] });
    }
  };

  return (
    <EuiFormRow
      label={
        <>
          <FormattedMessage
            id="xpack.snapshotRestore.featureStatesFormField.formRowLabel"
            defaultMessage="Include feature states from"
          />{' '}
          <EuiIconTip
            type="questionInCircle"
            content={
              <span>
                <FormattedMessage
                  id="xpack.snapshotRestore.featureStatesFormField.formRowLabelTooltip"
                  defaultMessage="A feature state contains the indices, system indices and data streams used to store configurations, history, and other data for an Elastic feature."
                />
              </span>
            }
            iconProps={{
              className: 'eui-alignTop',
            }}
          />
        </>
      }
      labelAppend={
        <EuiSwitch
          data-test-subj="toggleIncludeNone"
          compressed
          label={
            <>
              <FormattedMessage
                id="xpack.snapshotRestore.featureStatesFormField.includeNoneLabel"
                defaultMessage="Include none"
              />{' '}
              <EuiIconTip
                type="questionInCircle"
                content={
                  <span>
                    <FormattedMessage
                      id="xpack.snapshotRestore.featureStatesFormField.includeNoneDescription"
                      defaultMessage="All system indices can be omitted by including none of the feature states."
                    />
                  </span>
                }
                iconProps={{
                  className: 'eui-alignTop',
                }}
              />
            </>
          }
          checked={hasNoneOptionSelected}
          onChange={onIncludeNoneSwitchChange}
        />
      }
    >
      <EuiComboBox
        data-test-subj="featureStatesDropdown"
        placeholder={i18n.translate(
          'xpack.snapshotRestore.featureStatesFormField.allFeaturesLabel',
          { defaultMessage: 'All features' }
        )}
        options={featuresOptions}
        selectedOptions={hasNoneOptionSelected ? [] : selectedOptions}
        isDisabled={hasNoneOptionSelected}
        onChange={onChange}
        isLoading={isLoadingFeatures}
        isClearable={true}
      />
    </EuiFormRow>
  );
};
