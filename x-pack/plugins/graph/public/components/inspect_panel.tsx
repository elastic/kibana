/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiTab, EuiTabs, EuiText } from '@elastic/eui';
import { monaco, XJsonLang } from '@kbn/monaco';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';

interface InspectPanelProps {
  showInspect: boolean;
  indexPattern?: DataView;
  lastRequest?: string;
  lastResponse?: string;
}

const CODE_EDITOR_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  fontSize: 12,
  lineNumbers: 'on',
  minimap: {
    enabled: false,
  },
  overviewRulerBorder: false,
  readOnly: true,
  scrollbar: {
    alwaysConsumeMouseWheel: false,
  },
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  wrappingIndent: 'indent',
};

const dummyCallback = () => {};

export const InspectPanel = ({
  showInspect,
  lastRequest,
  lastResponse,
  indexPattern,
}: InspectPanelProps) => {
  const [selectedTabId, setSelectedTabId] = useState('request');

  const onRequestClick = () => setSelectedTabId('request');
  const onResponseClick = () => setSelectedTabId('response');

  const editorContent = useMemo(
    () => (selectedTabId === 'request' ? lastRequest : lastResponse),
    [lastRequest, lastResponse, selectedTabId]
  );

  if (showInspect) {
    return (
      <div className="gphGraph__menus">
        <div>
          <div className="kuiLocalDropdownTitle">
            <FormattedMessage id="xpack.graph.inspect.title" defaultMessage="Inspect" />
          </div>

          <div className="list-group-item">
            <EuiText size="xs" className="help-block">
              <span>http://host:port/{indexPattern?.id}/_graph/explore</span>
            </EuiText>
            <EuiTabs>
              <EuiTab onClick={onRequestClick} isSelected={'request' === selectedTabId}>
                <FormattedMessage
                  id="xpack.graph.inspect.requestTabTitle"
                  defaultMessage="Request"
                />
              </EuiTab>
              <EuiTab onClick={onResponseClick} isSelected={'response' === selectedTabId}>
                <FormattedMessage
                  id="xpack.graph.inspect.responseTabTitle"
                  defaultMessage="Response"
                />
              </EuiTab>
            </EuiTabs>
            <CodeEditor
              languageId={XJsonLang.ID}
              height={240}
              value={editorContent || ''}
              onChange={dummyCallback}
              editorDidMount={dummyCallback}
              options={CODE_EDITOR_OPTIONS}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
};
