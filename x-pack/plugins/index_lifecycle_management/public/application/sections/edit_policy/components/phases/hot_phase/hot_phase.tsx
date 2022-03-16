/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiCallOut, EuiTextColor, EuiSwitch, EuiText } from '@elastic/eui';

import { useFormData, useKibana } from '../../../../../../shared_imports';

import { i18nTexts } from '../../../i18n_texts';

import { useConfiguration, UseField } from '../../../form';

import { useEditPolicyContext } from '../../../edit_policy_context';

import { ROLLOVER_FORM_PATHS, isUsingDefaultRolloverPath } from '../../../constants';

import { LearnMoreLink, DescribedFormRow } from '../../';

import {
  ForcemergeField,
  IndexPriorityField,
  SearchableSnapshotField,
  ReadonlyField,
  ShrinkField,
} from '../shared_fields';
import { Phase } from '../phase';

import { useRolloverValueRequiredValidation } from './use_rollover_value_required_validation';
import {
  MaxPrimaryShardSizeField,
  MaxAgeField,
  MaxDocumentCountField,
  MaxIndexSizeField,
} from './components';

const rolloverFieldPaths = Object.values(ROLLOVER_FORM_PATHS);

export const HotPhase: FunctionComponent = () => {
  const { license } = useEditPolicyContext();
  const [formData] = useFormData({
    watch: [isUsingDefaultRolloverPath, ...rolloverFieldPaths],
  });
  const { isUsingRollover } = useConfiguration();
  const isUsingDefaultRollover: boolean = get(formData, isUsingDefaultRolloverPath);

  const showEmptyRolloverFieldsError = useRolloverValueRequiredValidation();

  const { docLinks } = useKibana().services;

  return (
    <Phase phase="hot">
      <DescribedFormRow
        title={
          <h3>
            {i18n.translate('xpack.indexLifecycleMgmt.hotPhase.rolloverFieldTitle', {
              defaultMessage: 'Rollover',
            })}
          </h3>
        }
        description={
          <>
            <EuiTextColor color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.indexLifecycleMgmt.editPolicy.hotPhase.rolloverDescriptionMessage"
                  defaultMessage="Start writing to a new index when the current index reaches a certain size, document count, or age. Enables you to optimize performance and manage resource usage when working with time series data."
                />
              </p>
            </EuiTextColor>
            <EuiSpacer />
            <EuiTextColor color="subdued">
              <p>
                <strong>
                  {i18n.translate(
                    'xpack.indexLifecycleMgmt.rollover.rolloverOffsetsPhaseTimingDescriptionNote',
                    { defaultMessage: 'Note: ' }
                  )}
                </strong>
                {i18nTexts.editPolicy.rolloverOffsetsHotPhaseTiming}{' '}
                <LearnMoreLink
                  text={
                    <FormattedMessage
                      id="xpack.indexLifecycleMgmt.editPolicy.hotPhase.learnAboutRolloverLinkText"
                      defaultMessage="Learn more"
                    />
                  }
                  docPath={docLinks.links.elasticsearch.ilmRollover}
                />
              </p>
            </EuiTextColor>
            <EuiSpacer />
            <UseField<boolean> path={isUsingDefaultRolloverPath}>
              {(field) => (
                <>
                  <EuiText color="default">
                    <EuiSwitch
                      label={field.label}
                      checked={field.value}
                      onChange={(e) => field.setValue(e.target.checked)}
                      data-test-subj="useDefaultRolloverSwitch"
                    />
                  </EuiText>
                  <EuiSpacer size="s" />
                  <FormattedMessage
                    id="xpack.indexLifecycleMgmt.editPolicy.hotPhase.rolloverDefaultsTipContent"
                    defaultMessage="Roll over when an index is 30 days old or any primary shard reaches 50 gigabytes."
                  />
                </>
              )}
            </UseField>
          </>
        }
        fullWidth
      >
        {isUsingDefaultRollover === false ? (
          <div aria-live="polite" role="region">
            <UseField<boolean> path="_meta.hot.customRollover.enabled">
              {(field) => (
                <EuiSwitch
                  label={field.label}
                  checked={field.value}
                  onChange={(e) => field.setValue(e.target.checked)}
                  data-test-subj="rolloverSwitch"
                />
              )}
            </UseField>
            {isUsingRollover && (
              <>
                <EuiSpacer size="m" />
                {showEmptyRolloverFieldsError && (
                  <>
                    <EuiCallOut
                      size="s"
                      title={i18nTexts.editPolicy.errors.rollOverConfigurationCallout.title}
                      data-test-subj="rolloverSettingsRequired"
                      color="danger"
                    >
                      <div>{i18nTexts.editPolicy.errors.rollOverConfigurationCallout.body}</div>
                    </EuiCallOut>
                    <EuiSpacer size="s" />
                  </>
                )}

                <MaxPrimaryShardSizeField />
                <EuiSpacer />

                <MaxAgeField />
                <EuiSpacer />

                <MaxDocumentCountField />
                <EuiSpacer />

                {/* This field is currently deprecated and will be removed in v8+ of the stack */}
                <MaxIndexSizeField />
              </>
            )}
          </div>
        ) : (
          <div />
        )}
      </DescribedFormRow>
      {isUsingRollover && (
        <>
          {<ForcemergeField phase={'hot'} />}
          <ShrinkField phase={'hot'} />
          {license.canUseSearchableSnapshot() && <SearchableSnapshotField phase="hot" />}
          <ReadonlyField phase={'hot'} />
        </>
      )}
      <IndexPriorityField phase={'hot'} />
    </Phase>
  );
};
