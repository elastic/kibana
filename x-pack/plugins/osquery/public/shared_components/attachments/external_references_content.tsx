/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { createUseContext } from './create_use_contenxt';
import type { IExternalReferenceMetaDataProps } from './lazy_external_reference_content';
import { PackQueriesAttachmentWrapper } from './pack_queries_attachment_wrapper';

const osqueryCasesContext = createContext<{ asSystemRequest: boolean }>({
  asSystemRequest: false,
});
const AttachmentContent = (props: IExternalReferenceMetaDataProps) => {
  const { externalReferenceMetadata } = props;

  const contextValue = useMemo(
    () => ({
      asSystemRequest: true,
    }),
    []
  );

  return (
    <EuiFlexGroup data-test-subj="osquery-attachment-content">
      <EuiFlexItem>
        <osqueryCasesContext.Provider value={contextValue}>
          <PackQueriesAttachmentWrapper
            actionId={externalReferenceMetadata.actionId}
            queryId={externalReferenceMetadata.queryId}
            agentIds={externalReferenceMetadata.agentIds}
          />
        </osqueryCasesContext.Provider>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const useOsqueryCasestContext = createUseContext(osqueryCasesContext, 'testCase');

// eslint-disable-next-line import/no-default-export
export { AttachmentContent as default };
