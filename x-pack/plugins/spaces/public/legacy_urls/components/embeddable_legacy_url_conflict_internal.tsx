/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiCodeBlock,
  EuiLink,
  EuiSpacer,
  EuiTextAlign,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import type { SpacesManager } from '../../spaces_manager';
import type { EmbeddableLegacyUrlConflictProps } from '../types';

export interface InternalProps {
  spacesManager: SpacesManager;
}

export const EmbeddableLegacyUrlConflictInternal = (
  props: InternalProps & EmbeddableLegacyUrlConflictProps
) => {
  const { spacesManager, targetType, sourceId } = props;
  const [aliasJsonString, setAliasJsonString] = useState('');

  useEffect(() => {
    async function setup() {
      const activeSpace = await spacesManager.getActiveSpace();
      setAliasJsonString(
        JSON.stringify({ targetSpace: activeSpace.id, targetType, sourceId }, null, 2)
      );
    }
    setup();
  }, [spacesManager, targetType, sourceId]);

  const [expandError, setExpandError] = useState(false);
  return (
    <>
      <FormattedMessage
        id="xpack.spaces.legacyURLConflict.longMessage"
        defaultMessage="We found 2 saved objects for this panel. Disable the legacy URL alias to fix this error."
      />
      <EuiSpacer />
      {expandError ? (
        <EuiTextAlign textAlign="left">
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.spaces.legacyURLConflict.expandErrorText"
                defaultMessage="Copy this JSON and use it with the {documentationLink}"
                values={{
                  documentationLink: (
                    <EuiLink
                      external
                      href="https://www.elastic.co/guide/en/kibana/master/spaces-api-disable-legacy-url-aliases.html"
                      target="_blank"
                    >
                      {i18n.translate('xpack.spaces.legacyURLConflict.documentationLinkText', {
                        defaultMessage: '_disable_legacy_url_aliases API',
                      })}
                    </EuiLink>
                  ),
                }}
              />
            }
            color="danger"
            iconType="alert"
          >
            <EuiCodeBlock fontSize="s" language="json" isCopyable={true} paddingSize="none">
              {aliasJsonString}
            </EuiCodeBlock>
          </EuiCallOut>
        </EuiTextAlign>
      ) : (
        <EuiButtonEmpty onClick={() => setExpandError(true)}>
          {i18n.translate('xpack.spaces.legacyURLConflict.expandError', {
            defaultMessage: `View details`,
          })}
        </EuiButtonEmpty>
      )}
    </>
  );
};
