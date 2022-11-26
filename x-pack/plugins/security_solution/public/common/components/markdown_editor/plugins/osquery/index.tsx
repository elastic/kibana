/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickBy, isEmpty } from 'lodash';
import type { Plugin } from 'unified';
import React, { useContext, useMemo, useState, useCallback } from 'react';
import type { RemarkTokenizer } from '@elastic/eui';
import {
  EuiSpacer,
  EuiCodeBlock,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { useForm, FormProvider } from 'react-hook-form';
import styled from 'styled-components';
import type { EuiMarkdownEditorUiPluginEditorProps } from '@elastic/eui/src/components/markdown_editor/markdown_types';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../lib/kibana';
import { LabelField } from './label_field';
import OsqueryLogo from './osquery_icon/osquery.svg';
import { OsqueryFlyout } from '../../../../../detections/components/osquery/osquery_flyout';
import { BasicAlertDataContext } from '../../../event_details/investigation_guide_view';
import { OsqueryNotAvailablePrompt } from './not_available_prompt';

const StyledEuiButton = styled(EuiButton)`
  > span > img {
    margin-block-end: 0;
  }
`;

const OsqueryEditorComponent = ({
  node,
  onSave,
  onCancel,
}: EuiMarkdownEditorUiPluginEditorProps<{
  configuration: {
    label?: string;
    query: string;
    ecs_mapping: { [key: string]: {} };
  };
}>) => {
  const isEditMode = node != null;
  const {
    osquery,
    application: {
      capabilities: { osquery: osqueryPermissions },
    },
  } = useKibana().services;
  const formMethods = useForm<{
    label: string;
    query: string;
    ecs_mapping: Record<string, unknown>;
  }>({
    defaultValues: {
      label: node?.configuration?.label,
      query: node?.configuration?.query,
      ecs_mapping: node?.configuration?.ecs_mapping,
    },
  });

  const onSubmit = useCallback(
    (data) => {
      onSave(
        `!{osquery${JSON.stringify(
          pickBy(
            {
              query: data.query,
              label: data.label,
              ecs_mapping: data.ecs_mapping,
            },
            (value) => !isEmpty(value)
          )
        )}}`,
        {
          block: true,
        }
      );
    },
    [onSave]
  );

  const noOsqueryPermissions = useMemo(
    () =>
      (!osqueryPermissions.runSavedQueries || !osqueryPermissions.readSavedQueries) &&
      !osqueryPermissions.writeLiveQueries,
    [
      osqueryPermissions.readSavedQueries,
      osqueryPermissions.runSavedQueries,
      osqueryPermissions.writeLiveQueries,
    ]
  );

  const OsqueryActionForm = useMemo(() => {
    if (osquery?.LiveQueryField) {
      const { LiveQueryField } = osquery;

      return (
        <FormProvider {...formMethods}>
          <LabelField />
          <EuiSpacer size="m" />
          <LiveQueryField formMethods={formMethods} />
        </FormProvider>
      );
    }
    return null;
  }, [formMethods, osquery]);

  if (noOsqueryPermissions) {
    return <OsqueryNotAvailablePrompt />;
  }

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {isEditMode ? (
            <FormattedMessage
              id="xpack.securitySolution.markdown.osquery.editModalTitle"
              defaultMessage="Edit query"
            />
          ) : (
            <FormattedMessage
              id="xpack.securitySolution.markdown.osquery.addModalTitle"
              defaultMessage="Add query"
            />
          )}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <>{OsqueryActionForm}</>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>
          {i18n.translate('xpack.securitySolution.markdown.osquery.modalCancelButtonLabel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton onClick={formMethods.handleSubmit(onSubmit)} fill>
          {isEditMode ? (
            <FormattedMessage
              id="xpack.securitySolution.markdown.osquery.addModalConfirmButtonLabel"
              defaultMessage="Add query"
            />
          ) : (
            <FormattedMessage
              id="xpack.securitySolution.markdown.osquery.editModalConfirmButtonLabel"
              defaultMessage="Save changes"
            />
          )}
        </EuiButton>
      </EuiModalFooter>
    </>
  );
};

const OsqueryEditor = React.memo(OsqueryEditorComponent);

export const plugin = {
  name: 'osquery',
  button: {
    label: 'Osquery',
    iconType: 'logoOsquery',
  },
  helpText: (
    <div>
      <EuiCodeBlock language="md" fontSize="l" paddingSize="s" isCopyable>
        {'!{osquery{options}}'}
      </EuiCodeBlock>
      <EuiSpacer size="s" />
    </div>
  ),
  editor: OsqueryEditor,
};

export const parser: Plugin = function () {
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.blockTokenizers;
  const methods = Parser.prototype.blockMethods;

  const tokenizeOsquery: RemarkTokenizer = function (eat, value, silent) {
    if (value.startsWith('!{osquery') === false) return false;

    const nextChar = value[9];

    if (nextChar !== '{' && nextChar !== '}') return false; // this isn't actually a osquery

    if (silent) {
      return true;
    }

    // is there a configuration?
    const hasConfiguration = nextChar === '{';

    let match = '!{osquery';
    let configuration = {};

    if (hasConfiguration) {
      let configurationString = '';

      let openObjects = 0;

      for (let i = 9; i < value.length; i++) {
        const char = value[i];
        if (char === '{') {
          openObjects++;
          configurationString += char;
        } else if (char === '}') {
          openObjects--;
          if (openObjects === -1) {
            break;
          }
          configurationString += char;
        } else {
          configurationString += char;
        }
      }

      match += configurationString;
      try {
        configuration = JSON.parse(configurationString);
      } catch (e) {
        const now = eat.now();
        this.file.fail(`Unable to parse osquery JSON configuration: ${e}`, {
          line: now.line,
          column: now.column + 9,
        });
      }
    }

    match += '}';

    return eat(match)({
      type: 'osquery',
      configuration,
    });
  };

  tokenizers.osquery = tokenizeOsquery;
  methods.splice(methods.indexOf('text'), 0, 'osquery');
};

// receives the configuration from the parser and renders
const RunOsqueryButtonRenderer = ({
  configuration,
}: {
  configuration: {
    label?: string;
    query: string;
    ecs_mapping: { [key: string]: {} };
    test: [];
  };
}) => {
  const [showFlyout, setShowFlyout] = useState(false);
  const { agentId, alertId } = useContext(BasicAlertDataContext);

  const handleOpen = useCallback(() => setShowFlyout(true), [setShowFlyout]);

  const handleClose = useCallback(() => setShowFlyout(false), [setShowFlyout]);

  return (
    <>
      <StyledEuiButton iconType={OsqueryLogo} onClick={handleOpen}>
        {configuration.label ??
          i18n.translate('xpack.securitySolution.markdown.osquery.runOsqueryButtonLabel', {
            defaultMessage: 'Run Osquery',
          })}
      </StyledEuiButton>
      {showFlyout && (
        <OsqueryFlyout
          defaultValues={{
            ...(alertId ? { alertIds: [alertId] } : {}),
            query: configuration.query,
            ecs_mapping: configuration.ecs_mapping,
            queryField: false,
          }}
          agentId={agentId}
          onClose={handleClose}
        />
      )}
    </>
  );
};

export { RunOsqueryButtonRenderer as renderer };
