/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import 'react-ace';
import 'brace/theme/textmate';
import React, { Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiTitle } from '@elastic/eui';

import { Repository } from '../../../../../../../common/types';
import { EuiCodeEditor } from '../../../../../../shared_imports';

interface Props {
  repository: Repository;
}

export const DefaultDetails: React.FunctionComponent<Props> = ({
  repository: { name, settings },
}) => {
  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryDetails.settingsTitle"
            defaultMessage="Settings"
          />
        </h3>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiCodeEditor
        mode="json"
        theme="textmate"
        width="100%"
        isReadOnly
        value={JSON.stringify(settings, null, 2)}
        setOptions={{
          showLineNumbers: false,
          tabSize: 2,
          maxLines: Infinity,
        }}
        editorProps={{
          $blockScrolling: Infinity,
        }}
        showGutter={false}
        minLines={6}
        aria-label={i18n.translate(
          'xpack.snapshotRestore.repositoryDetails.genericSettingsDescription',
          {
            defaultMessage: `Readonly settings for repository '{name}'`,
            values: {
              name,
            },
          }
        )}
      />
    </Fragment>
  );
};
