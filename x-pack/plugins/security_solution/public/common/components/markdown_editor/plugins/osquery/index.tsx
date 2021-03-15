/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

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
import { useKibana } from '../../../../lib/kibana';
import { DraggableBadge } from '../../../draggables';

const OsqueryEditorComponent = ({ node, onSave, onCancel }) => {
  const [actionId, setActionId] = useState<string | null>(null);
  const { getCreateOsqueryActionForm } = useKibana().services.osquery;

  const OsqueryActionForm = useMemo(
    () =>
      getCreateOsqueryActionForm({
        onSuccess: (data, variables, context) => {
          if (data.actions[0]?.action_id) {
            setActionId(data.actions[0]?.action_id);
          }
        },
      }),
    []
  );

  // console.error('OsqueryActionFlyout', OsqueryActionFlyout);

  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{'Run Osquery action'}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <>{OsqueryActionForm}</>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel}>{'Cancel'}</EuiButtonEmpty>
        <EuiButton
          disabled={!actionId}
          onClick={() =>
            onSave(`!{osquery${JSON.stringify({ action_id: actionId })}}`, {
              block: true,
            })
          }
          fill
        >
          {'Attach results'}
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
  // console.error('props', props);

  return (
    <>
      <DraggableBadge
        contextId="case-osquery-action"
        eventId={props.action_id}
        field="action_id"
        value={props.action_id}
      />
    </>
  );
};

export { ChartMarkdownRenderer as renderer };
