/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
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
            defaultMessage="Semantic text field available"
          />
        }
        color="primary"
        iconType="iInCircle"
      >
        <FormattedMessage
          id="xpack.dataVisualizer.semanticTextInfo.body"
          defaultMessage="It's possible automatically add a semantic text field to your index. In the Advanced tab, click 'add additional field' and choose 'Semantic text'."
        />
      </EuiCallOut>

      <EuiSpacer size="m" />
    </>
  ) : null;
};
