/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiText } from '@elastic/eui';
import { useMlKibana } from '../../../../../contexts/kibana';

interface Props {
  destIndex: string;
}

export const IndexPatternPrompt: FC<Props> = ({ destIndex }) => {
  const {
    services: {
      http: { basePath },
      application: { capabilities },
    },
  } = useMlKibana();

  const canCreateDataView = useMemo(
    () =>
      capabilities.savedObjectsManagement.edit === true || capabilities.indexPatterns.save === true,
    [capabilities]
  );

  return (
    <>
      <EuiText size="xs" color="warning">
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.dataViewPromptMessage"
          defaultMessage="No data view exists for index {destIndex}. "
          values={{
            destIndex,
          }}
        />
        {canCreateDataView === true ? (
          <FormattedMessage
            id="xpack.ml.dataframe.analytics.dataViewPromptLink"
            defaultMessage="{linkToDataViewManagement} for {destIndex}."
            values={{
              destIndex,
              linkToDataViewManagement: (
                <EuiLink
                  href={`${basePath.get()}/app/management/kibana/dataViews/create`}
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.ml.dataframe.analytics.dataViewPromptLinkText"
                    defaultMessage="Create a data view"
                  />
                </EuiLink>
              ),
            }}
          />
        ) : null}
      </EuiText>
    </>
  );
};
