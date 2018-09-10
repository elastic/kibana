/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { fileDataVisualizerProvider } from '../models/file_data_visualizer';

function analyseFiles(callWithRequest, data) {
  const { analyseFile } = fileDataVisualizerProvider(callWithRequest);
  return analyseFile(data);
}

export function fileDataVisualizerRoutes(server, commonRouteConfig) {
  server.route({
    method: 'POST',
    path: '/api/ml/file_data_visualizer/analyze_file',
    handler(request, reply) {
      const callWithRequest = callWithRequestFactory(server, request);
      // const callWithRequest = callWithRequestMock;
      const data = request.payload;
      return analyseFiles(callWithRequest, data)
        .then(resp => reply(resp))
        .catch(resp => reply(wrapError(resp)));
    },
    config: {
      ...commonRouteConfig
    }
  });
}

// function callWithRequestMock() {
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
