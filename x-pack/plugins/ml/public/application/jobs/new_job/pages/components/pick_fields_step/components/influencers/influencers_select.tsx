/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, ReactNode, useContext } from 'react';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { isDefined } from '../../../../../../../../../common/types/guards';
import { MLJobWizardFieldStatsFlyoutContext } from '../field_stats_flyout/field_stats_flyout';
import { JobCreatorContext } from '../../../job_creator_context';
import { Field } from '../../../../../../../../../common/types/fields';
import {
  createFieldOptions,
  createMlcategoryFieldOption,
} from '../../../../../common/job_creator/util/general';

interface Props {
  fields: Field[];
  changeHandler(i: string[]): void;
  selectedInfluencers: string[];
}

export const InfluencersSelect: FC<Props> = ({ fields, changeHandler, selectedInfluencers }) => {
  const { jobCreator } = useContext(JobCreatorContext);
  const { setIsFlyoutVisible, setFieldName } = useContext(MLJobWizardFieldStatsFlyoutContext);

  const options: EuiComboBoxOptionOption[] = [
    ...createFieldOptions(fields, jobCreator.additionalFields),
    ...createMlcategoryFieldOption(jobCreator.categorizationFieldName),
  ];

  const selection: EuiComboBoxOptionOption[] = selectedInfluencers.map((i) => ({ label: i }));

  function onChange(selectedOptions: EuiComboBoxOptionOption[]) {
    changeHandler(selectedOptions.map((o) => o.label));
  }
  const renderOption = (option: EuiComboBoxOptionOption, searchValue: string): ReactNode => {
    const fieldName = option.label;
    return option.isGroupLabelOption ? (
      option.label
    ) : (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={true}>
          <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="inspect"
            onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
              if (ev.type === 'click') {
                ev.currentTarget.focus();
              }
              ev.preventDefault();
              ev.stopPropagation();

              if (isDefined(fieldName)) {
                setFieldName(fieldName);
                setIsFlyoutVisible(true);
              }
            }}
            aria-label={i18n.translate('xpack.ml.fieldContextPopover.topFieldValuesAriaLabel', {
              defaultMessage: 'Show top 10 field values',
            })}
            data-test-subj={'mlAggSelectFieldStatsPopoverButton'}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <EuiComboBox
      options={options}
      selectedOptions={selection}
      onChange={onChange}
      isClearable={false}
      data-test-subj="mlInfluencerSelect"
      renderOption={renderOption}
    />
  );
};
