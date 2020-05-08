/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { monaco } from '@kbn/ui-shared-deps/monaco';
import { EuiPanel, EuiFormRow, EuiFieldText, EuiProgress } from '@elastic/eui';
import { CodeEditor } from '../../../../../src/plugins/kibana_react/public';
import { NodeDefinition, RenderNode } from '../types';
import { useLoader } from '../state';
// import { Observable } from 'rxjs';
// import { IKibanaSearchResponse, IKibanaSearchRequest } from '../../../../../src/plugins/data/public';

interface SearchNodeState {
  endpoint: string;
  code: string;
}

function SearchNode({ node, dispatch }: RenderNode<SearchNodeState>) {
  const loader = useLoader();
  return (
    <EuiPanel>
      {loader.lastData[node.id]?.loading ? <EuiProgress /> : null}

      <EuiFormRow
        label={i18n.translate('xpack.pipeline_builder.searchNode.endpointLabel', {
          defaultMessage: 'Endpoint path',
        })}
      >
        <EuiFieldText
          value={node.state.endpoint}
          onChange={e => {
            dispatch({
              type: 'SET_NODE',
              nodeId: node.id,
              newState: { ...node.state, endpoint: e.target.value },
            });
          }}
        />
      </EuiFormRow>

      <CodeEditor
        languageId="json"
        // 99% width allows the editor to resize horizontally. 100% prevents it from resizing.
        width="99%"
        height="200px"
        value={node.state.code}
        onChange={code => {
          dispatch({
            type: 'SET_NODE',
            nodeId: node.id,
            newState: { ...node.state, code },
          });
        }}
        options={{
          fontSize: 12,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          wrappingIndent: 'indent',
          automaticLayout: true,
        }}
        editorDidMount={(editor: monaco.editor.IStandaloneCodeEditor) => {
          // Updating tab size for the editor
          const model = editor.getModel();
          if (model) {
            model.updateOptions({ tabSize: 2 });
          }
        }}
      />
    </EuiPanel>
  );
}

export const definition: NodeDefinition<SearchNodeState> = {
  initialize(): SearchNodeState {
    return {
      endpoint: '',
      code: '{}',
    };
  },

  renderReact: SearchNode,

  validateInputs: () => [],

  async run(state, inputs, deps) {
    return {
      aggregations: {
        buckets: [
          {
            key: 'A',
            value: 100,
          },
          {
            key: 'B',
            value: 200,
          },
        ],
      },
    };
  },
};

// interface Props {
//   request: IKibanaSearchRequest;
//   strategy?: string;
//   search: (signal: AbortSignal) => Observable<IKibanaSearchResponse>;
// }

// interface State {
//   searching: boolean;
//   response?: IKibanaSearchResponse;
//   error?: any;
// }

// export class DoSearch extends React.Component<Props, State> {
//   private abortController?: AbortController;

//   constructor(props: Props) {
//     super(props);

//     this.state = {
//       searching: false,
//       response: undefined,
//     };
//   }

//   search = async () => {
//     if (this.state.searching && this.abortController) {
//       this.abortController.abort();
//     }

//     this.setState({
//       searching: true,
//       response: undefined,
//       error: undefined,
//     });

//     this.abortController = new AbortController();

//     this.props.search(this.abortController.signal).subscribe(
//       response => {
//         this.setState({ response, error: undefined });
//       },
//       error => {
//         this.setState({ error, searching: false, response: undefined });
//       },
//       () => {
//         this.setState({ searching: false, error: undefined });
//       }
//     );
//   };

//   cancel = () => {
//     if (this.abortController) {
//       this.abortController.abort();
//     }
//   };
// }
