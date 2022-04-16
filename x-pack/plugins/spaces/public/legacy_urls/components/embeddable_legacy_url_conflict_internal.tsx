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
import React, { useState } from 'react';
import useAsync from 'react-use/lib/useAsync';

import type { StartServicesAccessor } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { PluginsStart } from '../../plugin';
import type { SpacesManager } from '../../spaces_manager';
import type { EmbeddableLegacyUrlConflictProps } from '../types';

export interface InternalProps {
  spacesManager: SpacesManager;
  getStartServices: StartServicesAccessor<PluginsStart>;
}

export const EmbeddableLegacyUrlConflictInternal = (
  props: InternalProps & EmbeddableLegacyUrlConflictProps
) => {
  const { spacesManager, getStartServices, targetType, sourceId } = props;

  const [expandError, setExpandError] = useState(false);

  const { value: asyncParams } = useAsync(async () => {
    const [{ docLinks }] = await getStartServices();
    const { id: targetSpace } = await spacesManager.getActiveSpace();
    const docLink = docLinks.links.spaces.kibanaDisableLegacyUrlAliasesApi;
    const aliasJsonString = JSON.stringify({ targetSpace, targetType, sourceId }, null, 2);
    return { docLink, aliasJsonString };
  }, [getStartServices, spacesManager]);
  const { docLink, aliasJsonString } = asyncParams ?? {};

  if (!aliasJsonString || !docLink) {
    return null;
  }

  return (
    <>
      <FormattedMessage
        id="xpack.spaces.embeddableLegacyUrlConflict.messageText"
        defaultMessage="We found 2 saved objects for this panel. Disable the legacy URL alias to fix this error."
      />
      <EuiSpacer />
      {expandError ? (
        <EuiTextAlign textAlign="left">
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.spaces.embeddableLegacyUrlConflict.calloutTitle"
                defaultMessage="Copy this JSON and use it with the {documentationLink}"
                values={{
                  documentationLink: (
                    <EuiLink external href={docLink} target="_blank">
                      {'_disable_legacy_url_aliases API'}
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
          {i18n.translate('xpack.spaces.embeddableLegacyUrlConflict.detailsButton', {
            defaultMessage: `View details`,
          })}
        </EuiButtonEmpty>
      )}
    </>
  );
};
