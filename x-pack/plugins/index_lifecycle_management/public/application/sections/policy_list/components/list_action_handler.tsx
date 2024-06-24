/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { usePolicyListContext } from '../policy_list_context';
import { IndexTemplatesFlyout } from '../../../components';
import { ConfirmDelete, AddPolicyToTemplateConfirmModal, ViewPolicyFlyout } from '.';

interface Props {
  updatePolicies: () => void;
}
export const ListActionHandler: React.FunctionComponent<Props> = ({ updatePolicies }) => {
  const { listAction, setListAction } = usePolicyListContext();
  if (listAction?.actionType === 'viewIndexTemplates') {
    return (
      <IndexTemplatesFlyout
        policyName={listAction.selectedPolicy.name}
        indexTemplates={listAction.selectedPolicy.indexTemplates ?? []}
        close={() => {
          setListAction(null);
        }}
      />
    );
  }
  if (listAction?.actionType === 'deletePolicy') {
    return (
      <ConfirmDelete
        policyToDelete={listAction.selectedPolicy}
        callback={() => {
          updatePolicies();
          setListAction(null);
        }}
        onCancel={() => {
          setListAction(null);
        }}
      />
    );
  }

  if (listAction?.actionType === 'addIndexTemplate') {
    return (
      <AddPolicyToTemplateConfirmModal
        policy={listAction.selectedPolicy}
        onSuccess={(indexTemplate: string) => {
          // update the linked index templates of the selected policy
          listAction!.selectedPolicy.indexTemplates = [
            ...(listAction!.selectedPolicy.indexTemplates || []),
            indexTemplate,
          ];
          setListAction(null);
        }}
        onCancel={() => setListAction(null)}
      />
    );
  }

  if (listAction?.actionType === 'viewPolicy') {
    return <ViewPolicyFlyout policy={listAction.selectedPolicy} />;
  }

  return null;
};
