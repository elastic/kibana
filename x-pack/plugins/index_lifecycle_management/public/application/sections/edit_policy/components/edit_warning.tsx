/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useEditPolicyContext } from '../edit_policy_context';
import { getIndicesListPath } from '../../../services/navigation';
import { useKibana } from '../../../../shared_imports';
import { IndexTemplatesFlyout } from '../../../components/index_templates_flyout';

export const EditWarning: FunctionComponent = () => {
  const { isNewPolicy, indices, indexTemplates, policyName } = useEditPolicyContext();
  const {
    services: { getUrlForApp },
  } = useKibana();

  const [isIndexTemplatesFlyoutShown, setIsIndexTemplatesShown] = useState<boolean>(false);

  if (isNewPolicy) {
    return null;
  }
  const indicesLink =
    indices.length > 0 ? (
      <EuiLink
        data-test-subj="linkedIndicesLink"
        external={true}
        href={getIndicesListPath(policyName ?? '', getUrlForApp)}
        target="_blank"
      >
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.editPolicy.linkedIndices"
          defaultMessage="{indicesCount, plural, one {# linked index} other {# linked indices}}"
          values={{ indicesCount: indices.length }}
        />
      </EuiLink>
    ) : null;

  const indexTemplatesLink =
    indexTemplates.length > 0 ? (
      <EuiLink
        data-test-subj="linkedIndexTemplatesLink"
        onClick={() => setIsIndexTemplatesShown(!isIndexTemplatesFlyoutShown)}
      >
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.editPolicy.linkedIndexTemplates"
          defaultMessage="{indexTemplatesCount, plural, one {# linked index template} other {# linked index templates}}"
          values={{ indexTemplatesCount: indexTemplates.length }}
        />
      </EuiLink>
    ) : null;
  const dependenciesLinks = indicesLink ? (
    <>
      {indicesLink}
      {indexTemplatesLink ? (
        <FormattedMessage
          id="xpack.indexLifecycleMgmt.editPolicy.andDependenciesLink"
          defaultMessage=" and {indexTemplatesLink}"
          values={{ indexTemplatesLink }}
        />
      ) : null}
    </>
  ) : (
    indexTemplatesLink
  );
  return (
    <>
      {isIndexTemplatesFlyoutShown && (
        <IndexTemplatesFlyout
          policyName={policyName ?? ''}
          indexTemplates={indexTemplates}
          close={() => setIsIndexTemplatesShown(false)}
        />
      )}
      <EuiText data-test-subj="editWarning">
        <p>
          <strong>
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.editingExistingPolicyMessage"
              defaultMessage="You are editing an existing policy."
            />
          </strong>
          {dependenciesLinks ? (
            <FormattedMessage
              id="xpack.indexLifecycleMgmt.editPolicy.dependenciesMessage"
              defaultMessage=" Any changes you make will affect {dependenciesLinks} that {count, plural, one {is} other {are}} attached to this policy."
              values={{
                dependenciesLinks,
                count: indices.length + indexTemplates.length,
              }}
            />
          ) : null}
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.saveAsNewMessage"
            defaultMessage=" Alternatively, you can save these changes in a new policy."
          />
        </p>
      </EuiText>
    </>
  );
};
