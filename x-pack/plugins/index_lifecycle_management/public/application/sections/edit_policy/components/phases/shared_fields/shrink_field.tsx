/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiTextColor, EuiRadioGroup, EuiSpacer } from '@elastic/eui';
import React, { FunctionComponent } from 'react';

import { get } from 'lodash';
import { NumericField, useFormData } from '../../../../../../shared_imports';

import { useEditPolicyContext } from '../../../edit_policy_context';
import { UseField, useGlobalFields } from '../../../form';
import { i18nTexts } from '../../../i18n_texts';

import { LearnMoreLink, DescribedFormRow } from '../../';
import { byteSizeUnits } from '../../../constants';
import { UnitField } from './unit_field';
import { useKibana } from '../../../../../../shared_imports';

interface Props {
  phase: 'hot' | 'warm';
}

export const ShrinkField: FunctionComponent<Props> = ({ phase }) => {
  const globalFields = useGlobalFields();
  const { setValue: setIsUsingShardSize } =
    globalFields[`${phase}IsUsingShardSize` as 'hotIsUsingShardSize'];
  const { policy } = useEditPolicyContext();
  const isUsingShardSizePath = `_meta.${phase}.shrink.isUsingShardSize`;
  const [formData] = useFormData({ watch: [isUsingShardSizePath] });
  const isUsingShardSize: boolean | undefined = get(formData, isUsingShardSizePath);
  const path = `phases.${phase}.actions.shrink.${
    isUsingShardSize ? 'max_primary_shard_size' : 'number_of_shards'
  }`;
  const { docLinks } = useKibana().services;
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
          <LearnMoreLink docPath={docLinks.links.elasticsearch.ilmShrink} />
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
        <>
          <EuiRadioGroup
            options={[
              {
                id: `${phase}-configureShardCount`,
                label: i18nTexts.editPolicy.shrinkCountLabel,
                'data-test-subj': `${phase}-configureShardCount`,
              },
              {
                id: `${phase}-configureShardSize`,
                label: i18nTexts.editPolicy.shrinkSizeLabel,
                'data-test-subj': `${phase}-configureShardSize`,
              },
            ]}
            idSelected={
              isUsingShardSize ? `${phase}-configureShardSize` : `${phase}-configureShardCount`
            }
            onChange={(id) => setIsUsingShardSize(id === `${phase}-configureShardSize`)}
          />
          <EuiSpacer />
          <UseField
            path={path}
            key={path}
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
            }}
          />
        </>
      )}
    </DescribedFormRow>
  );
};
