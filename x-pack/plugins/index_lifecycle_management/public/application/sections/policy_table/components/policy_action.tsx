/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { usePolicyListContext } from '../policy_list_context';
import { IndexTemplatesFlyout } from '../../../components/index_templates_flyout';
import { ConfirmDelete } from './confirm_delete';
import { AddPolicyToTemplateConfirmModal } from './add_policy_to_template_confirm_modal';

interface Props {
  updatePolicies: () => void;
}
export const PolicyAction: React.FunctionComponent<Props> = ({ updatePolicies }) => {
  const { policyAction, setPolicyAction } = usePolicyListContext();
  if (policyAction?.action === 'viewIndexTemplates') {
    return (
      <IndexTemplatesFlyout
        policy={policyAction.policy}
        close={() => {
          setPolicyAction(null);
        }}
      />
    );
  }
  if (policyAction?.action === 'deletePolicy') {
    return (
      <ConfirmDelete
        policyToDelete={policyAction.policy}
        callback={() => {
          updatePolicies();
          setPolicyAction(null);
        }}
        onCancel={() => {
          setPolicyAction(null);
        }}
      />
    );
  }

  if (policyAction?.action === 'addIndexTemplate') {
    return (
      <AddPolicyToTemplateConfirmModal
        policy={policyAction.policy}
        onSuccess={(indexTemplate: string) => {
          policyAction!.policy.indexTemplates = [
            ...(policyAction!.policy.indexTemplates || []),
            indexTemplate,
          ];
          setPolicyAction(null);
        }}
        onCancel={() => setPolicyAction(null)}
      />
    );
  }
  return null;
};
