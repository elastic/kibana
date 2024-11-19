/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { FILE_FORMATS } from '../../../../../common/constants';

interface Props {
  results: FindFileStructureResponse;
}

export const SemanticTextInfo: FC<Props> = ({ results }) => {
  return results.format === FILE_FORMATS.TIKA ? (
    <>
      <EuiSpacer size="m" />

      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.dataVisualizer.semanticTextInfo.title"
            defaultMessage="Semantic text field type now available"
          />
        }
        color="primary"
        iconType="iInCircle"
      >
        <FormattedMessage
          id="xpack.dataVisualizer.semanticTextInfo.body"
          defaultMessage="You can add a {semanticText} field when importing this file to easily enable semantic search on the content."
          values={{
            semanticText: (
              <EuiLink
                href="https://www.elastic.co/guide/en/elasticsearch/reference/current/semantic-text.html"
                target="_blank"
                external
              >
                <code css={{ fontWeight: 'bold' }}>semantic_text</code>
              </EuiLink>
            ),
          }}
        />
        <br />
        <FormattedMessage
          id="xpack.dataVisualizer.semanticTextInfo.body2"
          defaultMessage="In the Advanced tab, click 'Add additional field' and choose 'Add semantic text field'."
        />
      </EuiCallOut>

      <EuiSpacer size="m" />
    </>
  ) : null;
};
