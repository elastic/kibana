/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiToolTip, EuiLink, EuiText, EuiTextColor } from '@elastic/eui';
import React, { FunctionComponent } from 'react';

import { get } from 'lodash';
import { NumericField, useFormData } from '../../../../../../shared_imports';

import { useEditPolicyContext } from '../../../edit_policy_context';
import { UseField, useGlobalFields } from '../../../form';
import { i18nTexts } from '../../../i18n_texts';

import { LearnMoreLink, DescribedFormRow } from '../../';
import { byteSizeUnits } from '../../../constants';
import { UnitField } from './unit_field';

interface Props {
  phase: 'hot' | 'warm';
}

export const ShrinkField: FunctionComponent<Props> = ({ phase }) => {
  const globalFields = useGlobalFields();
  const { setValue: setIsUsingShardSize } = globalFields[
    `${phase}IsUsingShardSize` as 'hotIsUsingShardSize'
  ];
  const { policy } = useEditPolicyContext();
  const isUsingShardSizePath = `_meta.${phase}.shrink.isUsingShardSize`;
  const [formData] = useFormData({ watch: [isUsingShardSizePath] });
  const isUsingShardSize: boolean | undefined = get(formData, isUsingShardSizePath);
  const toggleIsUsingShardSize = () => {
    setIsUsingShardSize(!isUsingShardSize);
  };
  const path = `phases.${phase}.actions.shrink.${
    isUsingShardSize ? 'max_primary_shard_size' : 'number_of_shards'
  }`;
  return (
    <DescribedFormRow
      title={
        <h3>
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.shrinkText"
            defaultMessage="Shrink"
          />
        </h3>
      }
      description={
        <EuiTextColor color="subdued">
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.shrinkIndexExplanationText"
            defaultMessage="Shrink the index to a new index with fewer primary shards."
          />{' '}
          <LearnMoreLink docPath="ilm-shrink.html" />
        </EuiTextColor>
      }
      titleSize="xs"
      switchProps={{
        'data-test-subj': `${phase}-shrinkSwitch`,
        label: i18nTexts.editPolicy.shrinkLabel,
        initialValue: Boolean(policy.phases[phase]?.actions?.shrink),
      }}
      fullWidth
    >
      {isUsingShardSize === undefined ? null : (
        <UseField
          path={path}
          component={NumericField}
          componentProps={{
            fullWidth: false,
            euiFieldProps: {
              'data-test-subj': `${phase}-primaryShard${isUsingShardSize ? 'Size' : 'Count'}`,
              min: 1,
              append: isUsingShardSize ? (
                <UnitField
                  path={`_meta.${phase}.shrink.maxPrimaryShardSizeUnits`}
                  options={byteSizeUnits}
                  euiFieldProps={{
                    'data-test-subj': `${phase}-shrinkMaxPrimaryShardSizeUnits`,
                    'aria-label': i18nTexts.editPolicy.maxPrimaryShardSizeUnitsLabel,
                  }}
                />
              ) : null,
            },
            labelAppend: (
              <EuiText size="xs">
                <EuiToolTip content={i18nTexts.editPolicy.shrinkCountOrSizeTooltip}>
                  <EuiLink
                    onClick={() => toggleIsUsingShardSize()}
                    data-test-subj={`${phase}-toggleIsUsingShardSize`}
                  >
                    {isUsingShardSize ? (
                      <FormattedMessage
                        id="xpack.indexLifecycleMgmt.editPolicy.shrink.configureShardCountLabel"
                        defaultMessage="Configure shard count"
                      />
                    ) : (
                      <FormattedMessage
                        id="xpack.indexLifecycleMgmt.editPolicy.shrink.configureShardSizeLabel"
                        defaultMessage="Configure shard size"
                      />
                    )}
                  </EuiLink>
                </EuiToolTip>
              </EuiText>
            ),
          }}
        />
      )}
    </DescribedFormRow>
  );
};
