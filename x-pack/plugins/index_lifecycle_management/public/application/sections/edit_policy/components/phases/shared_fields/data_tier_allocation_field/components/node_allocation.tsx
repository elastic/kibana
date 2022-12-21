/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, FunctionComponent } from 'react';
import { get } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty, EuiText, EuiSpacer } from '@elastic/eui';

import { SelectField, useFormData, useKibana } from '../../../../../../../../shared_imports';

import { UseField } from '../../../../../form';

import { LearnMoreLink } from '../../../../learn_more_link';

import { NodeAttrsDetails } from './node_attrs_details';

import { SharedProps } from './types';

const i18nTexts = {
  allocateToDataNodesOption: i18n.translate(
    'xpack.indexLifecycleMgmt.editPolicy.nodeAllocation.allocateToDataNodesOption',
    { defaultMessage: 'Any data node' }
  ),
};

export const NodeAllocation: FunctionComponent<SharedProps> = ({
  phase,
  nodes,
  isLoading,
  isCloudEnabled,
  isUsingDeprecatedDataRoleConfig,
}) => {
  const allocationNodeAttributePath = `_meta.${phase}.allocationNodeAttribute`;

  const [formData] = useFormData({
    watch: [allocationNodeAttributePath],
  });
  const { docLinks } = useKibana().services;
  const shardAllocationSettingsUrl = docLinks.links.elasticsearch.shardAllocationSettings;
  const selectedAllocationNodeAttribute = get(formData, allocationNodeAttributePath);

  const [selectedNodeAttrsForDetails, setSelectedNodeAttrsForDetails] = useState<string | null>(
    null
  );

  const nodeOptions = Object.keys(nodes).map((attrs) => ({
    text: `${attrs} (${nodes[attrs].length})`,
    value: attrs,
  }));

  nodeOptions.sort((a, b) => a.value.localeCompare(b.value));

  let nodeAllocationOptions = [];

  // On Cloud, allocating to data tiers and allocating to data nodes is mutually exclusive. So we
  // only let users select this option if they're using data nodes. Otherwise we remove it.
  //
  // On prem, users should have the freedom to choose this option, even if they're using node roles.
  // So we always give them this option.
  if (!isCloudEnabled || isUsingDeprecatedDataRoleConfig) {
    const allocateToDataNodesOption = { text: i18nTexts.allocateToDataNodesOption, value: '' };
    nodeAllocationOptions.push(allocateToDataNodesOption);
  }

  nodeAllocationOptions = nodeAllocationOptions.concat(nodeOptions);
  return (
    <>
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.nodeAllocation.customOption.description"
            defaultMessage="Use node attributes to control shard allocation. {learnMoreLink}."
            values={{
              learnMoreLink: (
                <LearnMoreLink
                  text={
                    <FormattedMessage
                      id="xpack.indexLifecycleMgmt.editPolicy.learnAboutShardAllocationLink"
                      defaultMessage="Learn about shard allocation"
                    />
                  }
                  docPath={shardAllocationSettingsUrl}
                />
              ),
            }}
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      {/*
        TODO: this field component must be revisited to support setting multiple require values and to support
        setting `include and exclude values on ILM policies. See https://github.com/elastic/kibana/issues/77344
      */}
      <UseField
        path={`_meta.${phase}.allocationNodeAttribute`}
        component={SelectField}
        componentProps={{
          helpText: !!selectedAllocationNodeAttribute ? (
            <EuiButtonEmpty
              size="xs"
              style={{ maxWidth: 400 }}
              data-test-subj={`${phase}-viewNodeDetailsFlyoutButton`}
              flush="left"
              onClick={() => setSelectedNodeAttrsForDetails(selectedAllocationNodeAttribute)}
            >
              <FormattedMessage
                id="xpack.indexLifecycleMgmt.editPolicy.viewNodeDetailsButton"
                defaultMessage="View nodes with the selected attribute"
              />
            </EuiButtonEmpty>
          ) : undefined,
          euiFieldProps: {
            'data-test-subj': `${phase}-selectedNodeAttrs`,
            options: nodeAllocationOptions,
            hasNoInitialSelection: false,
            isLoading,
          },
        }}
      />
      {selectedNodeAttrsForDetails ? (
        <NodeAttrsDetails
          selectedNodeAttrs={selectedNodeAttrsForDetails}
          close={() => setSelectedNodeAttrsForDetails(null)}
        />
      ) : null}
    </>
  );
};
