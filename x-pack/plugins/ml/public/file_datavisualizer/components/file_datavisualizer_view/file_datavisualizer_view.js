/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, {
  Component,
} from 'react';

import {
  EuiFilePicker,
  EuiSpacer,
  EuiCallOut,
  EuiLoadingSpinner,
} from '@elastic/eui';

import { ml } from 'plugins/ml/services/ml_api_service';
import { ResultsView } from '../results_view';


export class FileDataVisualizerView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      files: {},
      fileContents: '',
      fileSize: 0,
      fileTooLarge: false,
      loading: false,
      loaded: false,
      results: undefined,
    };

    this.maxPayloadBytes = this.props.maxPayloadBytes;
  }

  // componentDidMount() {
  //   this.testData();
  // }

  // testData() {
  //   this.setState({
  //     results: dataMock(),
  //     loaded: true,
  //     loading: false,
  //     fileTooLarge: false,
  //   });
  // }

  onChange = (files) => {
    this.setState({
      files,
      loading: (files.length > 0),
      loaded: false,
      fileContents: '',
      fileSize: 0,
      fileTooLarge: false,
      results: undefined,
    }, () => {
      if (files.length) {
        this.analyseFile(files[0]);
      }
    });

  };

  renderFiles = () => {
    if (this.state.files.length > 0) {
      return (
        <React.Fragment>
          <ul>
            {Object.keys(this.state.files).map((item, i) => (
              <li key={i}>
                <strong>{this.state.files[item].name}</strong> ({this.state.files[item].size} bytes)
              </li>)
            )}
          </ul>
        </React.Fragment>
      );
    } else {
      return <p>Add some files to see a demo of retrieving from the FileList</p>;
    }
  }

  analyseFile = (file) => {
    if (file.size < this.maxPayloadBytes) {
      readFile(file)
        .then(({ data }) => {
          this.setState({
            fileContents: data,
            fileSize: file.size,
          });

          ml.analyseFile(data)
            .then((resp) => {
              this.setState({
                results: resp.results,
                loaded: true,
                loading: false,
                fileTooLarge: false,
              });
            })
            .catch((error) => {
              console.error(error);
            });
        })
        .catch((error) => {
          console.error(error);
        });
    } else {
      this.setState({
        loaded: false,
        loading: false,
        fileTooLarge: true,
        fileSize: file.size,
      });
    }
  }

  render() {
    return (
      <React.Fragment>
        <div style={{ textAlign: 'center' }} >
          <EuiFilePicker
            id="asdf2"
            initialPromptText="Select or drag and drop a log file"
            onChange={files => this.onChange(files)}
          />
        </div>

        <EuiSpacer size="l" />

        {(this.state.loading) &&
          <div style={{ textAlign: 'center' }} >
            <EuiLoadingSpinner size="xl"/>
          </div>
        }

        {(this.state.fileTooLarge) &&
          <FileTooLarge
            fileSize={this.state.fileSize}
            maxFileSize={this.maxPayloadBytes}
          />
        }

        {(this.state.loaded) &&
          <ResultsView
            results={this.state.results}
            data={this.state.fileContents}
          />
        }
      </React.Fragment>
    );
  }
}

function FileTooLarge({ fileSize, maxFileSize }) {
  return (
    <EuiCallOut
      title="File size is too large"
      color="danger"
      iconType="cross"
    >
      <p>
        File size uploaded is {fileSize}, the max file size for uploading to Kibana is {maxFileSize}
      </p>
    </EuiCallOut>
  );
}

function readFile(file) {
  return new Promise((resolve, reject) => {

    if (file && file.size) {
      const reader = new FileReader();
      reader.readAsText(file);

      reader.onload = (() => {
        return () => {
          const data = reader.result;
          if (data === '') {
            reject();
          } else {
            resolve({ data });
          }
        };
      })(file);
    } else {
      reject();
    }
  });
}

// function dataMock() {
//   return {
//     'num_lines_analyzed': 1000,
//     'num_messages_analyzed': 999,
//     'sample_start': 'time,airline,responsetime,sourcetype\n2014-06-23 00:00:00Z,AAL,132.2046,farequote\n',
//     'charset': 'UTF-8',
//     'has_byte_order_marker': false,
//     'format': 'delimited',
//     'multiline_start_pattern': '^\'?\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}',
//     'exclude_lines_pattern': '^"?time"?,"?airline"?,"?responsetime"?,"?sourcetype"?',
//     'input_fields': [
//       'time',
//       'airline',
//       'responsetime',
//       'sourcetype'
//     ],
//     'has_header_row': true,
//     'delimiter': ',',
//     'timestamp_field': 'time',
//     'timestamp_formats': [
//       'YYYY-MM-dd HH:mm:ssZ'
//     ],
//     'need_client_timezone': false,
//     'mappings': {
//       '@timestamp': {
//         'type': 'date'
//       },
//       'airline': {
//         'type': 'keyword'
//       },
//       'responsetime': {
//         'type': 'double'
//       },
//       'sourcetype': {
//         'type': 'keyword'
//       },
//       'time': {
//         'type': 'date',
//         'format': 'YYYY-MM-dd HH:mm:ssZ'
//       }
//     },
//     'field_stats': {
//       'airline': {
//         'count': 999,
//         'cardinality': 19,
//         'top_hits': [
//           {
//             'value': 'AAL',
//             'count': 98
//           },
//           {
//             'value': 'AWE',
//             'count': 90
//           },
//           {
//             'value': 'ACA',
//             'count': 69
//           },
//           {
//             'value': 'JBU',
//             'count': 67
//           },
//           {
//             'value': 'AMX',
//             'count': 66
//           },
//           {
//             'value': 'FFT',
//             'count': 66
//           },
//           {
//             'value': 'UAL',
//             'count': 62
//           },
//           {
//             'value': 'ASA',
//             'count': 61
//           },
//           {
//             'value': 'JAL',
//             'count': 53
//           },
//           {
//             'value': 'VRD',
//             'count': 52
//           }
//         ]
//       },
//       'responsetime': {
//         'count': 999,
//         'cardinality': 998,
//         'min_value': 5.9133,
//         'max_value': 10168.7625,
//         'mean_value': 581.2884537537541,
//         'median_value': 194.6434,
//         'top_hits': [
//           {
//             'value': 20.1693,
//             'count': 2
//           },
//           {
//             'value': 5.9133,
//             'count': 1
//           },
//           {
//             'value': 7.6049,
//             'count': 1
//           },
//           {
//             'value': 7.9734,
//             'count': 1
//           },
//           {
//             'value': 8.0131,
//             'count': 1
//           },
//           {
//             'value': 8.4275,
//             'count': 1
//           },
//           {
//             'value': 8.5392,
//             'count': 1
//           },
//           {
//             'value': 8.7426,
//             'count': 1
//           },
//           {
//             'value': 8.8289,
//             'count': 1
//           },
//           {
//             'value': 9.0402,
//             'count': 1
//           }
//         ]
//       },
//       'sourcetype': {
//         'count': 999,
//         'cardinality': 1,
//         'top_hits': [
//           {
//             'value': 'farequote',
//             'count': 999
//           }
//         ]
//       },
//       'time': {
//         'count': 999,
//         'cardinality': 906,
//         'top_hits': [
//           {
//             'value': '2014-06-23 00:00:00Z',
//             'count': 20
//           },
//           {
//             'value': '2014-06-23 00:30:04Z',
//             'count': 3
//           },
//           {
//             'value': '2014-06-23 00:50:24Z',
//             'count': 3
//           },
//           {
//             'value': '2014-06-23 00:54:17Z',
//             'count': 3
//           },
//           {
//             'value': '2014-06-23 00:03:36Z',
//             'count': 2
//           },
//           {
//             'value': '2014-06-23 00:06:42Z',
//             'count': 2
//           },
//           {
//             'value': '2014-06-23 00:08:15Z',
//             'count': 2
//           },
//           {
//             'value': '2014-06-23 00:09:35Z',
//             'count': 2
//           },
//           {
//             'value': '2014-06-23 00:11:00Z',
//             'count': 2
//           },
//           {
//             'value': '2014-06-23 00:12:26Z',
//             'count': 2
//           }
//         ]
//       }
//     }
//   };
// }

// function Editor({ contents }) {
//   return (
//     <EuiCodeEditor
//       mode="json"
//       theme="github"
//       width="100%"
//       value={contents}
//       setOptions={{ fontSize: '12px', useWorker: false }}
//       showPrintMargin={false}
//       isReadOnly
//     />
//   );
// }
