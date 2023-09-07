/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from 'react-monaco-editor';

export const useCodeCompletion = (name: string) => {
  if (name === 'processors') {
    return {
      triggerCharacters: metadataList.map((metadata) => metadata[0]),
      provideCompletionItems: (
        model: monaco.editor.ITextModel,
        position: monaco.Position,
        context: monaco.languages.CompletionContext,
        token: monaco.CancellationToken
      ) => {
        const wordInfo = model.getWordUntilPosition(position);
        const currentWord = wordInfo && wordInfo.word;
        const suggestions: monaco.languages.CompletionItem[] = metadataList.map((metadata) => {
          return {
            label: metadata,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: metadata,
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column - currentWord.length,
              endColumn: position.column,
            },
          };
        });

        return {
          suggestions,
        };
      },
    };
  }
};

const metadataList: string[] = [
  'add_cloud_metadata',
  'add_cloudfoundry_metadata',
  'add_docker_metadata',
  'add_fields',
  'add_host_metadata',
  'add_id',
  'add_kubernetes_metadata',
  'add_labels',
  'add_locale',
  'add_nomad_metadata',
  'add_observer_metadata',
  'add_process_metadata',
  'add_tags',
  'append',
  'community_id',
  'convert',
  'copy_fields',
  'decode_base64_field',
  'decode_duration',
  'decode_json_fields',
  'decode_xml',
  'decode_xml_wineventlog',
  'decompress_gzip_field',
  'detect_mime_type',
  'dissect',
  'dns',
  'drop_event',
  'drop_fields',
  'extract_array',
  'fingerprint',
  'include_fields',
  'move-fields',
  'rate_limit',
  'registered_domain',
  'rename',
  'replace',
  'script',
  'syslog',
  'translate_sid',
  'truncate_fields',
  'urldecode',
  'fields',
  'target',
];
