/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';

import { CompareFieldsTable } from '../../../compare_fields_table';
import { EmptyPromptBody } from '../../index_properties/empty_prompt_body';
import { EmptyPromptTitle } from '../../index_properties/empty_prompt_title';
import * as i18n from '../../index_properties/translations';
import type { EnrichedFieldMetadata } from '../../../types';

interface Props {
  enrichedFieldMetadata: EnrichedFieldMetadata[];
}

const AllTabComponent: React.FC<Props> = ({ enrichedFieldMetadata }) => {
  const body = useMemo(() => <EmptyPromptBody body={i18n.ALL_EMPTY} />, []);
  const title = useMemo(() => <EmptyPromptTitle title={i18n.ALL_EMPTY_TITLE} />, []);

  return (
    <>
      {enrichedFieldMetadata.length > 0 ? (
        <>
          <EuiCallOut size="s" title={i18n.ALL_CALLOUT_TITLE(enrichedFieldMetadata.length)}>
            <p>{i18n.ALL_CALLOUT}</p>
          </EuiCallOut>
          <EuiSpacer />
          <CompareFieldsTable enrichedFieldMetadata={enrichedFieldMetadata} />
        </>
      ) : (
        <EuiEmptyPrompt
          body={body}
          iconType="cross"
          iconColor="danger"
          title={title}
          titleSize="s"
        />
      )}
    </>
  );
};

AllTabComponent.displayName = 'AllTabComponent';

export const AllTab = React.memo(AllTabComponent);
