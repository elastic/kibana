/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiSelect, EuiButtonEmpty, EuiCallOut, EuiFormRow } from '@elastic/eui';

import { ListNodesRouteResponse } from '../../../../../../common/types';
import { PhaseWithAllocationAction, Phases } from '../../../../services/policies/types';
import { PhaseValidationErrors, propertyof } from '../../../../services/policies/policy_validation';

import { ErrableFormRow } from '../form_errors';

import { NodeAttrsDetails } from './node_attrs_details';

interface Props<T extends PhaseWithAllocationAction> {
  phase: keyof Phases & string;
  errors?: PhaseValidationErrors<T>;
  phaseData: T;
  setPhaseData: (dataKey: keyof T & string, value: string) => void;
  isShowingErrors: boolean;
  nodes: ListNodesRouteResponse['nodesByAttributes'];
}
export const NodeAllocation = <T extends PhaseWithAllocationAction>({
  phase,
  setPhaseData,
  errors,
  phaseData,
  isShowingErrors,
  nodes,
}: React.PropsWithChildren<Props<T>>) => {
  const [selectedNodeAttrsForDetails, setSelectedNodeAttrsForDetails] = useState<string | null>(
    null
  );

  useEffect(() => {
    const attrs = Object.keys(nodes);
    if (attrs.length) {
      const [first] = attrs;
      setPhaseData('selectedNodeAttrs', first);
    }
  }, [nodes, setPhaseData]);

  const nodeOptions = Object.keys(nodes).map((attrs) => ({
    text: `${attrs} (${nodes[attrs].length})`,
    value: attrs,
  }));

  nodeOptions.sort((a, b) => a.value.localeCompare(b.value));

  if (!nodeOptions.length) {
    return (
      // Wrap in form row so that margins are consistent with when we can render
      // form controls.
      <EuiFormRow>
        <EuiCallOut
          data-test-subj="noNodeAttributesWarning"
          style={{ maxWidth: 400 }}
          title={
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.nodeAttributesMissingLabel"
              defaultMessage="No node attributes configured in elasticsearch.yml"
            />
          }
          color="warning"
        >
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.nodeAttributesMissingDescription"
            defaultMessage="You can't control shard allocation without node attributes."
          />
        </EuiCallOut>
      </EuiFormRow>
    );
  }

  // check that this string is a valid property
  const nodeAttrsProperty = propertyof<T>('selectedNodeAttrs');

  return (
    <Fragment>
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
                defaultMessage="View a list of nodes attached to this configuration"
              />
            </EuiButtonEmpty>
          ) : null
        }
      >
        <EuiSelect
          id={`${phase}-${nodeAttrsProperty}`}
          value={phaseData.selectedNodeAttrs || ' '}
          options={nodeOptions}
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
    </Fragment>
  );
};
