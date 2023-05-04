/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useMemo } from 'react';
import { sortBy } from 'lodash';

import { EuiFormRow, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import { useServices } from '../../app_context';
import { SlmPolicyPayload, RestoreSettings } from '../../../../common/types';

export type FeaturesOption = EuiComboBoxOptionOption<string>;

interface Props {
  featuresOptions: string[];
  selectedOptions: FeaturesOption[];
  onUpdateFormSettings: (
    arg: Partial<SlmPolicyPayload['config']> & Partial<RestoreSettings>
  ) => void;
  isLoadingFeatures?: boolean;
}

export const FeatureStatesFormField: FunctionComponent<Props> = ({
  isLoadingFeatures = false,
  featuresOptions,
  selectedOptions,
  onUpdateFormSettings,
}) => {
  const { i18n } = useServices();

  const optionsList = useMemo(() => {
    if (!isLoadingFeatures) {
      const featuresList = featuresOptions.map((feature) => ({
        label: feature,
      }));

      return sortBy(featuresList, 'label');
    }

    return [];
  }, [isLoadingFeatures, featuresOptions]);

  const onChange = (selected: FeaturesOption[]) => {
    onUpdateFormSettings({
      featureStates: selected.map((option) => option.label),
    });
  };

  return (
    <EuiFormRow>
      <EuiComboBox
        data-test-subj="featureStatesDropdown"
        placeholder={i18n.translate(
          'xpack.snapshotRestore.featureStatesFormField.allFeaturesLabel',
          { defaultMessage: 'All features' }
        )}
        options={optionsList}
        selectedOptions={selectedOptions}
        onChange={onChange}
        isLoading={isLoadingFeatures}
        isClearable={true}
      />
    </EuiFormRow>
  );
};
