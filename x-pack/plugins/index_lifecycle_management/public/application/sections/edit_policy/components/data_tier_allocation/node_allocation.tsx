/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiSelect, EuiButtonEmpty, EuiText, EuiSpacer } from '@elastic/eui';

import { PhaseWithAllocationAction } from '../../../../../../common/types';
import { propertyof } from '../../../../services/policies/policy_validation';

import { ErrableFormRow } from '../form_errors';

import { NodeAttrsDetails } from './node_attrs_details';
import { SharedProps } from './types';
import { LearnMoreLink } from '../learn_more_link';

const learnMoreLink = (
  <LearnMoreLink
    text={
      <FormattedMessage
        id="xpack.indexLifecycleMgmt.editPolicy.learnAboutShardAllocationLink"
        defaultMessage="Learn about shard allocation"
      />
    }
    docPath="modules-cluster.html#cluster-shard-allocation-settings"
  />
);

const i18nTexts = {
  doNotModifyAllocationOption: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.nodeAllocation.doNotModifyAllocationOption',
    { defaultMessage: 'Do not modify allocation configuration' }
  ),
};

export const NodeAllocation: FunctionComponent<SharedProps> = ({
  phase,
  setPhaseData,
  errors,
  phaseData,
  isShowingErrors,
  nodes,
}) => {
  const [selectedNodeAttrsForDetails, setSelectedNodeAttrsForDetails] = useState<string | null>(
    null
  );

  const nodeOptions = Object.keys(nodes).map((attrs) => ({
    text: `${attrs} (${nodes[attrs].length})`,
    value: attrs,
  }));

  nodeOptions.sort((a, b) => a.value.localeCompare(b.value));

  // check that this string is a valid property
  const nodeAttrsProperty = propertyof<PhaseWithAllocationAction>('selectedNodeAttrs');

  return (
    <>
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.nodeAllocation.customOption.description"
            defaultMessage="Use node attributes to control shard allocation. {learnMoreLink}."
            values={{ learnMoreLink }}
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      {/*
        TODO: this field component must be revisited to support setting multiple require values and to support
        setting `include and exclude values on ILM policies. See https://github.com/elastic/kibana/issues/77344
      */}
      <ErrableFormRow
        id={`${phase}-${nodeAttrsProperty}`}
        label={i18n.translate('xpack.indexLifecycleMgmt.editPolicy.nodeAllocationLabel', {
          defaultMessage: 'Select a node attribute',
        })}
        isShowingErrors={isShowingErrors}
        errors={errors?.selectedNodeAttrs}
        helpText={
          !!phaseData.selectedNodeAttrs ? (
            <EuiButtonEmpty
              size="xs"
              style={{ maxWidth: 400 }}
              data-test-subj={`${phase}-viewNodeDetailsFlyoutButton`}
              flush="left"
              onClick={() => setSelectedNodeAttrsForDetails(phaseData.selectedNodeAttrs)}
            >
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.viewNodeDetailsButton"
                defaultMessage="View nodes with the selected attribute"
              />
            </EuiButtonEmpty>
          ) : null
        }
      >
        <EuiSelect
          id={`${phase}-${nodeAttrsProperty}`}
          value={phaseData.selectedNodeAttrs || ' '}
          options={[{ text: i18nTexts.doNotModifyAllocationOption, value: '' }].concat(nodeOptions)}
          onChange={(e) => {
            setPhaseData(nodeAttrsProperty, e.target.value);
          }}
        />
      </ErrableFormRow>

      {selectedNodeAttrsForDetails ? (
        <NodeAttrsDetails
          selectedNodeAttrs={selectedNodeAttrsForDetails}
          close={() => setSelectedNodeAttrsForDetails(null)}
        />
      ) : null}
    </>
  );
};
