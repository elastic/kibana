/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import React, { useMemo, useState, useCallback } from 'react';
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
import { useKibana } from '../../../../lib/kibana';
import { OsqueryIcon } from './osquery_icon';
import { LabelField } from './label_field';
import { OsqueryFlyout } from '../../../../../detections/components/osquery/osquery_flyout';

const OsqueryEditorComponent = ({ node, onSave, onCancel }) => {
  const { osquery } = useKibana().services;
  const formMethods = useForm({
    defaultValues: {
      label: node?.label,
      savedQueryId: node?.savedQueryId,
      query: node?.query,
      ecs_mapping: node?.ecs_mapping,
    },
  });

  console.error('node', node);
  const onSubmit = useCallback(
    (data) => {
      onSave(`!{osquery${JSON.stringify(pick(data, ['label', 'query', 'ecs_mapping']))}}`, {
        block: true,
      });
    },
    [onSave]
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

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{'Add Osquery query'}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <>{OsqueryActionForm}</>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>{'Cancel'}</EuiButtonEmpty>
        <EuiButton onClick={formMethods.handleSubmit(onSubmit)} fill>
          {'Attach query'}
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

export function parser() {
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.blockTokenizers;
  const methods = Parser.prototype.blockMethods;

  function tokenizeOsquery(eat, value, silent) {
    if (value.startsWith('!{osquery') === false) return false;

    const nextChar = value[9];

    console.error('nextChar', nextChar);

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
      ...configuration,
    });
  }

  tokenizers.osquery = tokenizeOsquery;
  methods.splice(methods.indexOf('text'), 0, 'osquery');
}

// receives the configuration from the parser and renders
const ChartMarkdownRenderer = (props) => {
  console.error('props', props);
  const [showFlyout, setShowFlyout] = useState(false);
  const { osquery } = useKibana().services;

  return (
    <>
      <EuiButton iconType={OsqueryIcon} onClick={() => setShowFlyout(true)}>
        {props?.label ?? 'Run Osquery'}
      </EuiButton>
      {showFlyout && <OsqueryFlyout onClose={() => setShowFlyout(false)} />}
    </>
  );
};

export { ChartMarkdownRenderer as renderer };
