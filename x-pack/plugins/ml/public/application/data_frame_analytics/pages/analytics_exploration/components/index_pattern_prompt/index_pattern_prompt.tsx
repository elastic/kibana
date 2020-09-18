/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { useMlKibana } from '../../../../../contexts/kibana';

interface Props {
  destIndex: string;
}

export const IndexPatternPrompt: FC<Props> = ({ destIndex }) => {
  const {
    services: {
      http: { basePath },
    },
  } = useMlKibana();

  return (
    <>
      <EuiText size="xs" color="warning">
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.indexPatternPromptMessage"
          defaultMessage="No index pattern exists for index {destIndex}. {linkToIndexPatternManagement} for {destIndex}."
          values={{
            destIndex,
            linkToIndexPatternManagement: (
              <EuiLink
                href={`${basePath.get()}/app/management/kibana/indexPatterns/create`}
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.ml.dataframe.analytics.indexPatternPromptLinkText"
                  defaultMessage="Create an index pattern"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer size="m" />
    </>
  );
};
