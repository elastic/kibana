/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getParitionMap, getPodPartitions, getParititonCountByPod } from './get_pod_partitions';

test('two pods', () => {
  const allPods = ['foo', 'bar'];
  const allPartitions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const map = getParitionMap(allPods, allPartitions, 2);
  expect(map).toMatchInlineSnapshot(`
    Object {
      "1": Array [
        "bar",
        "foo",
      ],
      "10": Array [
        "bar",
        "foo",
      ],
      "11": Array [
        "bar",
        "foo",
      ],
      "12": Array [
        "bar",
        "foo",
      ],
      "13": Array [
        "bar",
        "foo",
      ],
      "14": Array [
        "bar",
        "foo",
      ],
      "15": Array [
        "bar",
        "foo",
      ],
      "16": Array [
        "bar",
        "foo",
      ],
      "17": Array [
        "bar",
        "foo",
      ],
      "18": Array [
        "bar",
        "foo",
      ],
      "19": Array [
        "bar",
        "foo",
      ],
      "2": Array [
        "bar",
        "foo",
      ],
      "20": Array [
        "bar",
        "foo",
      ],
      "3": Array [
        "bar",
        "foo",
      ],
      "4": Array [
        "bar",
        "foo",
      ],
      "5": Array [
        "bar",
        "foo",
      ],
      "6": Array [
        "bar",
        "foo",
      ],
      "7": Array [
        "bar",
        "foo",
      ],
      "8": Array [
        "bar",
        "foo",
      ],
      "9": Array [
        "bar",
        "foo",
      ],
    }
  `);
});

test('three pods', () => {
  const allPods = ['foo', 'bar', 'quz'];
  const allPartitions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const map = getParitionMap(allPods, allPartitions, 2);
  expect(map).toMatchInlineSnapshot(`
    Object {
      "1": Array [
        "bar",
        "foo",
      ],
      "10": Array [
        "bar",
        "foo",
      ],
      "11": Array [
        "quz",
        "bar",
      ],
      "12": Array [
        "foo",
        "quz",
      ],
      "13": Array [
        "bar",
        "foo",
      ],
      "14": Array [
        "quz",
        "bar",
      ],
      "15": Array [
        "foo",
        "quz",
      ],
      "16": Array [
        "bar",
        "foo",
      ],
      "17": Array [
        "quz",
        "bar",
      ],
      "18": Array [
        "foo",
        "quz",
      ],
      "19": Array [
        "bar",
        "foo",
      ],
      "2": Array [
        "quz",
        "bar",
      ],
      "20": Array [
        "quz",
        "bar",
      ],
      "3": Array [
        "foo",
        "quz",
      ],
      "4": Array [
        "bar",
        "foo",
      ],
      "5": Array [
        "quz",
        "bar",
      ],
      "6": Array [
        "foo",
        "quz",
      ],
      "7": Array [
        "bar",
        "foo",
      ],
      "8": Array [
        "quz",
        "bar",
      ],
      "9": Array [
        "foo",
        "quz",
      ],
    }
  `);
  const fooPartitions = getPodPartitions('foo', allPods, allPartitions, 2);
  expect(fooPartitions).toMatchInlineSnapshot(`
    Array [
      1,
      3,
      4,
      6,
      7,
      9,
      10,
      12,
      13,
      15,
      16,
      18,
      19,
    ]
  `);
  const barPartitions = getPodPartitions('bar', allPods, allPartitions, 2);
  expect(barPartitions).toMatchInlineSnapshot(`
    Array [
      1,
      2,
      4,
      5,
      7,
      8,
      10,
      11,
      13,
      14,
      16,
      17,
      19,
      20,
    ]
  `);
  const quzPartitions = getPodPartitions('quz', allPods, allPartitions, 2);
  expect(quzPartitions).toMatchInlineSnapshot(`
    Array [
      2,
      3,
      5,
      6,
      8,
      9,
      11,
      12,
      14,
      15,
      17,
      18,
      20,
    ]
  `);
});

test('64 pods', () => {
  const allPods = [
    'instance-0000000001 - background tasks',
    'instance-0000000002 - background tasks',
    'instance-0000000003 - background tasks',
    'instance-0000000004 - background tasks',
    'instance-0000000005 - background tasks',
    'instance-0000000006 - background tasks',
    'instance-0000000007 - background tasks',
    'instance-0000000008 - background tasks',
    'instance-0000000009 - background tasks',
    'instance-0000000010 - background tasks',
    'instance-0000000011 - background tasks',
    'instance-0000000012 - background tasks',
    'instance-0000000013 - background tasks',
    'instance-0000000014 - background tasks',
    'instance-0000000015 - background tasks',
    'instance-0000000016 - background tasks',
    'instance-0000000017 - background tasks',
    'instance-0000000018 - background tasks',
    'instance-0000000019 - background tasks',
    'instance-0000000020 - background tasks',
    'instance-0000000021 - background tasks',
    'instance-0000000022 - background tasks',
    'instance-0000000023 - background tasks',
    'instance-0000000024 - background tasks',
    'instance-0000000025 - background tasks',
    'instance-0000000026 - background tasks',
    'instance-0000000027 - background tasks',
    'instance-0000000028 - background tasks',
    'instance-0000000029 - background tasks',
    'instance-0000000030 - background tasks',
    'instance-0000000031 - background tasks',
    'instance-0000000032 - background tasks',
    'instance-0000000033 - background tasks',
    'instance-0000000034 - background tasks',
    'instance-0000000035 - background tasks',
    'instance-0000000036 - background tasks',
    'instance-0000000037 - background tasks',
    'instance-0000000038 - background tasks',
    'instance-0000000039 - background tasks',
    'instance-0000000040 - background tasks',
    'instance-0000000041 - background tasks',
    'instance-0000000042 - background tasks',
    'instance-0000000043 - background tasks',
    'instance-0000000044 - background tasks',
    'instance-0000000045 - background tasks',
    'instance-0000000046 - background tasks',
    'instance-0000000047 - background tasks',
    'instance-0000000048 - background tasks',
    'instance-0000000049 - background tasks',
    'instance-0000000050 - background tasks',
    'instance-0000000051 - background tasks',
    'instance-0000000052 - background tasks',
    'instance-0000000053 - background tasks',
    'instance-0000000054 - background tasks',
    'instance-0000000055 - background tasks',
    'instance-0000000056 - background tasks',
    'instance-0000000057 - background tasks',
    'instance-0000000058 - background tasks',
    'instance-0000000059 - background tasks',
    'instance-0000000060 - background tasks',
    'instance-0000000061 - background tasks',
    'instance-0000000062 - background tasks',
    'instance-0000000063 - background tasks',
    'instance-0000000064 - background tasks',
  ];
  // const allPartitions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const allPartitions = [];
  for (let i = 1; i <= 360; i++) {
    allPartitions.push(i);
  }
  const map = getParitionMap(allPods, allPartitions, 2);
  expect(map).toMatchInlineSnapshot(`
    Object {
      "1": Array [
        "instance-0000000001 - background tasks",
        "instance-0000000002 - background tasks",
      ],
      "10": Array [
        "instance-0000000019 - background tasks",
        "instance-0000000020 - background tasks",
      ],
      "100": Array [
        "instance-0000000007 - background tasks",
        "instance-0000000008 - background tasks",
      ],
      "101": Array [
        "instance-0000000009 - background tasks",
        "instance-0000000010 - background tasks",
      ],
      "102": Array [
        "instance-0000000011 - background tasks",
        "instance-0000000012 - background tasks",
      ],
      "103": Array [
        "instance-0000000013 - background tasks",
        "instance-0000000014 - background tasks",
      ],
      "104": Array [
        "instance-0000000015 - background tasks",
        "instance-0000000016 - background tasks",
      ],
      "105": Array [
        "instance-0000000017 - background tasks",
        "instance-0000000018 - background tasks",
      ],
      "106": Array [
        "instance-0000000019 - background tasks",
        "instance-0000000020 - background tasks",
      ],
      "107": Array [
        "instance-0000000021 - background tasks",
        "instance-0000000022 - background tasks",
      ],
      "108": Array [
        "instance-0000000023 - background tasks",
        "instance-0000000024 - background tasks",
      ],
      "109": Array [
        "instance-0000000025 - background tasks",
        "instance-0000000026 - background tasks",
      ],
      "11": Array [
        "instance-0000000021 - background tasks",
        "instance-0000000022 - background tasks",
      ],
      "110": Array [
        "instance-0000000027 - background tasks",
        "instance-0000000028 - background tasks",
      ],
      "111": Array [
        "instance-0000000029 - background tasks",
        "instance-0000000030 - background tasks",
      ],
      "112": Array [
        "instance-0000000031 - background tasks",
        "instance-0000000032 - background tasks",
      ],
      "113": Array [
        "instance-0000000033 - background tasks",
        "instance-0000000034 - background tasks",
      ],
      "114": Array [
        "instance-0000000035 - background tasks",
        "instance-0000000036 - background tasks",
      ],
      "115": Array [
        "instance-0000000037 - background tasks",
        "instance-0000000038 - background tasks",
      ],
      "116": Array [
        "instance-0000000039 - background tasks",
        "instance-0000000040 - background tasks",
      ],
      "117": Array [
        "instance-0000000041 - background tasks",
        "instance-0000000042 - background tasks",
      ],
      "118": Array [
        "instance-0000000043 - background tasks",
        "instance-0000000044 - background tasks",
      ],
      "119": Array [
        "instance-0000000045 - background tasks",
        "instance-0000000046 - background tasks",
      ],
      "12": Array [
        "instance-0000000023 - background tasks",
        "instance-0000000024 - background tasks",
      ],
      "120": Array [
        "instance-0000000047 - background tasks",
        "instance-0000000048 - background tasks",
      ],
      "121": Array [
        "instance-0000000049 - background tasks",
        "instance-0000000050 - background tasks",
      ],
      "122": Array [
        "instance-0000000051 - background tasks",
        "instance-0000000052 - background tasks",
      ],
      "123": Array [
        "instance-0000000053 - background tasks",
        "instance-0000000054 - background tasks",
      ],
      "124": Array [
        "instance-0000000055 - background tasks",
        "instance-0000000056 - background tasks",
      ],
      "125": Array [
        "instance-0000000057 - background tasks",
        "instance-0000000058 - background tasks",
      ],
      "126": Array [
        "instance-0000000059 - background tasks",
        "instance-0000000060 - background tasks",
      ],
      "127": Array [
        "instance-0000000061 - background tasks",
        "instance-0000000062 - background tasks",
      ],
      "128": Array [
        "instance-0000000063 - background tasks",
        "instance-0000000064 - background tasks",
      ],
      "129": Array [
        "instance-0000000001 - background tasks",
        "instance-0000000002 - background tasks",
      ],
      "13": Array [
        "instance-0000000025 - background tasks",
        "instance-0000000026 - background tasks",
      ],
      "130": Array [
        "instance-0000000003 - background tasks",
        "instance-0000000004 - background tasks",
      ],
      "131": Array [
        "instance-0000000005 - background tasks",
        "instance-0000000006 - background tasks",
      ],
      "132": Array [
        "instance-0000000007 - background tasks",
        "instance-0000000008 - background tasks",
      ],
      "133": Array [
        "instance-0000000009 - background tasks",
        "instance-0000000010 - background tasks",
      ],
      "134": Array [
        "instance-0000000011 - background tasks",
        "instance-0000000012 - background tasks",
      ],
      "135": Array [
        "instance-0000000013 - background tasks",
        "instance-0000000014 - background tasks",
      ],
      "136": Array [
        "instance-0000000015 - background tasks",
        "instance-0000000016 - background tasks",
      ],
      "137": Array [
        "instance-0000000017 - background tasks",
        "instance-0000000018 - background tasks",
      ],
      "138": Array [
        "instance-0000000019 - background tasks",
        "instance-0000000020 - background tasks",
      ],
      "139": Array [
        "instance-0000000021 - background tasks",
        "instance-0000000022 - background tasks",
      ],
      "14": Array [
        "instance-0000000027 - background tasks",
        "instance-0000000028 - background tasks",
      ],
      "140": Array [
        "instance-0000000023 - background tasks",
        "instance-0000000024 - background tasks",
      ],
      "141": Array [
        "instance-0000000025 - background tasks",
        "instance-0000000026 - background tasks",
      ],
      "142": Array [
        "instance-0000000027 - background tasks",
        "instance-0000000028 - background tasks",
      ],
      "143": Array [
        "instance-0000000029 - background tasks",
        "instance-0000000030 - background tasks",
      ],
      "144": Array [
        "instance-0000000031 - background tasks",
        "instance-0000000032 - background tasks",
      ],
      "145": Array [
        "instance-0000000033 - background tasks",
        "instance-0000000034 - background tasks",
      ],
      "146": Array [
        "instance-0000000035 - background tasks",
        "instance-0000000036 - background tasks",
      ],
      "147": Array [
        "instance-0000000037 - background tasks",
        "instance-0000000038 - background tasks",
      ],
      "148": Array [
        "instance-0000000039 - background tasks",
        "instance-0000000040 - background tasks",
      ],
      "149": Array [
        "instance-0000000041 - background tasks",
        "instance-0000000042 - background tasks",
      ],
      "15": Array [
        "instance-0000000029 - background tasks",
        "instance-0000000030 - background tasks",
      ],
      "150": Array [
        "instance-0000000043 - background tasks",
        "instance-0000000044 - background tasks",
      ],
      "151": Array [
        "instance-0000000045 - background tasks",
        "instance-0000000046 - background tasks",
      ],
      "152": Array [
        "instance-0000000047 - background tasks",
        "instance-0000000048 - background tasks",
      ],
      "153": Array [
        "instance-0000000049 - background tasks",
        "instance-0000000050 - background tasks",
      ],
      "154": Array [
        "instance-0000000051 - background tasks",
        "instance-0000000052 - background tasks",
      ],
      "155": Array [
        "instance-0000000053 - background tasks",
        "instance-0000000054 - background tasks",
      ],
      "156": Array [
        "instance-0000000055 - background tasks",
        "instance-0000000056 - background tasks",
      ],
      "157": Array [
        "instance-0000000057 - background tasks",
        "instance-0000000058 - background tasks",
      ],
      "158": Array [
        "instance-0000000059 - background tasks",
        "instance-0000000060 - background tasks",
      ],
      "159": Array [
        "instance-0000000061 - background tasks",
        "instance-0000000062 - background tasks",
      ],
      "16": Array [
        "instance-0000000031 - background tasks",
        "instance-0000000032 - background tasks",
      ],
      "160": Array [
        "instance-0000000063 - background tasks",
        "instance-0000000064 - background tasks",
      ],
      "161": Array [
        "instance-0000000001 - background tasks",
        "instance-0000000002 - background tasks",
      ],
      "162": Array [
        "instance-0000000003 - background tasks",
        "instance-0000000004 - background tasks",
      ],
      "163": Array [
        "instance-0000000005 - background tasks",
        "instance-0000000006 - background tasks",
      ],
      "164": Array [
        "instance-0000000007 - background tasks",
        "instance-0000000008 - background tasks",
      ],
      "165": Array [
        "instance-0000000009 - background tasks",
        "instance-0000000010 - background tasks",
      ],
      "166": Array [
        "instance-0000000011 - background tasks",
        "instance-0000000012 - background tasks",
      ],
      "167": Array [
        "instance-0000000013 - background tasks",
        "instance-0000000014 - background tasks",
      ],
      "168": Array [
        "instance-0000000015 - background tasks",
        "instance-0000000016 - background tasks",
      ],
      "169": Array [
        "instance-0000000017 - background tasks",
        "instance-0000000018 - background tasks",
      ],
      "17": Array [
        "instance-0000000033 - background tasks",
        "instance-0000000034 - background tasks",
      ],
      "170": Array [
        "instance-0000000019 - background tasks",
        "instance-0000000020 - background tasks",
      ],
      "171": Array [
        "instance-0000000021 - background tasks",
        "instance-0000000022 - background tasks",
      ],
      "172": Array [
        "instance-0000000023 - background tasks",
        "instance-0000000024 - background tasks",
      ],
      "173": Array [
        "instance-0000000025 - background tasks",
        "instance-0000000026 - background tasks",
      ],
      "174": Array [
        "instance-0000000027 - background tasks",
        "instance-0000000028 - background tasks",
      ],
      "175": Array [
        "instance-0000000029 - background tasks",
        "instance-0000000030 - background tasks",
      ],
      "176": Array [
        "instance-0000000031 - background tasks",
        "instance-0000000032 - background tasks",
      ],
      "177": Array [
        "instance-0000000033 - background tasks",
        "instance-0000000034 - background tasks",
      ],
      "178": Array [
        "instance-0000000035 - background tasks",
        "instance-0000000036 - background tasks",
      ],
      "179": Array [
        "instance-0000000037 - background tasks",
        "instance-0000000038 - background tasks",
      ],
      "18": Array [
        "instance-0000000035 - background tasks",
        "instance-0000000036 - background tasks",
      ],
      "180": Array [
        "instance-0000000039 - background tasks",
        "instance-0000000040 - background tasks",
      ],
      "181": Array [
        "instance-0000000041 - background tasks",
        "instance-0000000042 - background tasks",
      ],
      "182": Array [
        "instance-0000000043 - background tasks",
        "instance-0000000044 - background tasks",
      ],
      "183": Array [
        "instance-0000000045 - background tasks",
        "instance-0000000046 - background tasks",
      ],
      "184": Array [
        "instance-0000000047 - background tasks",
        "instance-0000000048 - background tasks",
      ],
      "185": Array [
        "instance-0000000049 - background tasks",
        "instance-0000000050 - background tasks",
      ],
      "186": Array [
        "instance-0000000051 - background tasks",
        "instance-0000000052 - background tasks",
      ],
      "187": Array [
        "instance-0000000053 - background tasks",
        "instance-0000000054 - background tasks",
      ],
      "188": Array [
        "instance-0000000055 - background tasks",
        "instance-0000000056 - background tasks",
      ],
      "189": Array [
        "instance-0000000057 - background tasks",
        "instance-0000000058 - background tasks",
      ],
      "19": Array [
        "instance-0000000037 - background tasks",
        "instance-0000000038 - background tasks",
      ],
      "190": Array [
        "instance-0000000059 - background tasks",
        "instance-0000000060 - background tasks",
      ],
      "191": Array [
        "instance-0000000061 - background tasks",
        "instance-0000000062 - background tasks",
      ],
      "192": Array [
        "instance-0000000063 - background tasks",
        "instance-0000000064 - background tasks",
      ],
      "193": Array [
        "instance-0000000001 - background tasks",
        "instance-0000000002 - background tasks",
      ],
      "194": Array [
        "instance-0000000003 - background tasks",
        "instance-0000000004 - background tasks",
      ],
      "195": Array [
        "instance-0000000005 - background tasks",
        "instance-0000000006 - background tasks",
      ],
      "196": Array [
        "instance-0000000007 - background tasks",
        "instance-0000000008 - background tasks",
      ],
      "197": Array [
        "instance-0000000009 - background tasks",
        "instance-0000000010 - background tasks",
      ],
      "198": Array [
        "instance-0000000011 - background tasks",
        "instance-0000000012 - background tasks",
      ],
      "199": Array [
        "instance-0000000013 - background tasks",
        "instance-0000000014 - background tasks",
      ],
      "2": Array [
        "instance-0000000003 - background tasks",
        "instance-0000000004 - background tasks",
      ],
      "20": Array [
        "instance-0000000039 - background tasks",
        "instance-0000000040 - background tasks",
      ],
      "200": Array [
        "instance-0000000015 - background tasks",
        "instance-0000000016 - background tasks",
      ],
      "201": Array [
        "instance-0000000017 - background tasks",
        "instance-0000000018 - background tasks",
      ],
      "202": Array [
        "instance-0000000019 - background tasks",
        "instance-0000000020 - background tasks",
      ],
      "203": Array [
        "instance-0000000021 - background tasks",
        "instance-0000000022 - background tasks",
      ],
      "204": Array [
        "instance-0000000023 - background tasks",
        "instance-0000000024 - background tasks",
      ],
      "205": Array [
        "instance-0000000025 - background tasks",
        "instance-0000000026 - background tasks",
      ],
      "206": Array [
        "instance-0000000027 - background tasks",
        "instance-0000000028 - background tasks",
      ],
      "207": Array [
        "instance-0000000029 - background tasks",
        "instance-0000000030 - background tasks",
      ],
      "208": Array [
        "instance-0000000031 - background tasks",
        "instance-0000000032 - background tasks",
      ],
      "209": Array [
        "instance-0000000033 - background tasks",
        "instance-0000000034 - background tasks",
      ],
      "21": Array [
        "instance-0000000041 - background tasks",
        "instance-0000000042 - background tasks",
      ],
      "210": Array [
        "instance-0000000035 - background tasks",
        "instance-0000000036 - background tasks",
      ],
      "211": Array [
        "instance-0000000037 - background tasks",
        "instance-0000000038 - background tasks",
      ],
      "212": Array [
        "instance-0000000039 - background tasks",
        "instance-0000000040 - background tasks",
      ],
      "213": Array [
        "instance-0000000041 - background tasks",
        "instance-0000000042 - background tasks",
      ],
      "214": Array [
        "instance-0000000043 - background tasks",
        "instance-0000000044 - background tasks",
      ],
      "215": Array [
        "instance-0000000045 - background tasks",
        "instance-0000000046 - background tasks",
      ],
      "216": Array [
        "instance-0000000047 - background tasks",
        "instance-0000000048 - background tasks",
      ],
      "217": Array [
        "instance-0000000049 - background tasks",
        "instance-0000000050 - background tasks",
      ],
      "218": Array [
        "instance-0000000051 - background tasks",
        "instance-0000000052 - background tasks",
      ],
      "219": Array [
        "instance-0000000053 - background tasks",
        "instance-0000000054 - background tasks",
      ],
      "22": Array [
        "instance-0000000043 - background tasks",
        "instance-0000000044 - background tasks",
      ],
      "220": Array [
        "instance-0000000055 - background tasks",
        "instance-0000000056 - background tasks",
      ],
      "221": Array [
        "instance-0000000057 - background tasks",
        "instance-0000000058 - background tasks",
      ],
      "222": Array [
        "instance-0000000059 - background tasks",
        "instance-0000000060 - background tasks",
      ],
      "223": Array [
        "instance-0000000061 - background tasks",
        "instance-0000000062 - background tasks",
      ],
      "224": Array [
        "instance-0000000063 - background tasks",
        "instance-0000000064 - background tasks",
      ],
      "225": Array [
        "instance-0000000001 - background tasks",
        "instance-0000000002 - background tasks",
      ],
      "226": Array [
        "instance-0000000003 - background tasks",
        "instance-0000000004 - background tasks",
      ],
      "227": Array [
        "instance-0000000005 - background tasks",
        "instance-0000000006 - background tasks",
      ],
      "228": Array [
        "instance-0000000007 - background tasks",
        "instance-0000000008 - background tasks",
      ],
      "229": Array [
        "instance-0000000009 - background tasks",
        "instance-0000000010 - background tasks",
      ],
      "23": Array [
        "instance-0000000045 - background tasks",
        "instance-0000000046 - background tasks",
      ],
      "230": Array [
        "instance-0000000011 - background tasks",
        "instance-0000000012 - background tasks",
      ],
      "231": Array [
        "instance-0000000013 - background tasks",
        "instance-0000000014 - background tasks",
      ],
      "232": Array [
        "instance-0000000015 - background tasks",
        "instance-0000000016 - background tasks",
      ],
      "233": Array [
        "instance-0000000017 - background tasks",
        "instance-0000000018 - background tasks",
      ],
      "234": Array [
        "instance-0000000019 - background tasks",
        "instance-0000000020 - background tasks",
      ],
      "235": Array [
        "instance-0000000021 - background tasks",
        "instance-0000000022 - background tasks",
      ],
      "236": Array [
        "instance-0000000023 - background tasks",
        "instance-0000000024 - background tasks",
      ],
      "237": Array [
        "instance-0000000025 - background tasks",
        "instance-0000000026 - background tasks",
      ],
      "238": Array [
        "instance-0000000027 - background tasks",
        "instance-0000000028 - background tasks",
      ],
      "239": Array [
        "instance-0000000029 - background tasks",
        "instance-0000000030 - background tasks",
      ],
      "24": Array [
        "instance-0000000047 - background tasks",
        "instance-0000000048 - background tasks",
      ],
      "240": Array [
        "instance-0000000031 - background tasks",
        "instance-0000000032 - background tasks",
      ],
      "241": Array [
        "instance-0000000033 - background tasks",
        "instance-0000000034 - background tasks",
      ],
      "242": Array [
        "instance-0000000035 - background tasks",
        "instance-0000000036 - background tasks",
      ],
      "243": Array [
        "instance-0000000037 - background tasks",
        "instance-0000000038 - background tasks",
      ],
      "244": Array [
        "instance-0000000039 - background tasks",
        "instance-0000000040 - background tasks",
      ],
      "245": Array [
        "instance-0000000041 - background tasks",
        "instance-0000000042 - background tasks",
      ],
      "246": Array [
        "instance-0000000043 - background tasks",
        "instance-0000000044 - background tasks",
      ],
      "247": Array [
        "instance-0000000045 - background tasks",
        "instance-0000000046 - background tasks",
      ],
      "248": Array [
        "instance-0000000047 - background tasks",
        "instance-0000000048 - background tasks",
      ],
      "249": Array [
        "instance-0000000049 - background tasks",
        "instance-0000000050 - background tasks",
      ],
      "25": Array [
        "instance-0000000049 - background tasks",
        "instance-0000000050 - background tasks",
      ],
      "250": Array [
        "instance-0000000051 - background tasks",
        "instance-0000000052 - background tasks",
      ],
      "251": Array [
        "instance-0000000053 - background tasks",
        "instance-0000000054 - background tasks",
      ],
      "252": Array [
        "instance-0000000055 - background tasks",
        "instance-0000000056 - background tasks",
      ],
      "253": Array [
        "instance-0000000057 - background tasks",
        "instance-0000000058 - background tasks",
      ],
      "254": Array [
        "instance-0000000059 - background tasks",
        "instance-0000000060 - background tasks",
      ],
      "255": Array [
        "instance-0000000061 - background tasks",
        "instance-0000000062 - background tasks",
      ],
      "256": Array [
        "instance-0000000063 - background tasks",
        "instance-0000000064 - background tasks",
      ],
      "257": Array [
        "instance-0000000001 - background tasks",
        "instance-0000000002 - background tasks",
      ],
      "258": Array [
        "instance-0000000003 - background tasks",
        "instance-0000000004 - background tasks",
      ],
      "259": Array [
        "instance-0000000005 - background tasks",
        "instance-0000000006 - background tasks",
      ],
      "26": Array [
        "instance-0000000051 - background tasks",
        "instance-0000000052 - background tasks",
      ],
      "260": Array [
        "instance-0000000007 - background tasks",
        "instance-0000000008 - background tasks",
      ],
      "261": Array [
        "instance-0000000009 - background tasks",
        "instance-0000000010 - background tasks",
      ],
      "262": Array [
        "instance-0000000011 - background tasks",
        "instance-0000000012 - background tasks",
      ],
      "263": Array [
        "instance-0000000013 - background tasks",
        "instance-0000000014 - background tasks",
      ],
      "264": Array [
        "instance-0000000015 - background tasks",
        "instance-0000000016 - background tasks",
      ],
      "265": Array [
        "instance-0000000017 - background tasks",
        "instance-0000000018 - background tasks",
      ],
      "266": Array [
        "instance-0000000019 - background tasks",
        "instance-0000000020 - background tasks",
      ],
      "267": Array [
        "instance-0000000021 - background tasks",
        "instance-0000000022 - background tasks",
      ],
      "268": Array [
        "instance-0000000023 - background tasks",
        "instance-0000000024 - background tasks",
      ],
      "269": Array [
        "instance-0000000025 - background tasks",
        "instance-0000000026 - background tasks",
      ],
      "27": Array [
        "instance-0000000053 - background tasks",
        "instance-0000000054 - background tasks",
      ],
      "270": Array [
        "instance-0000000027 - background tasks",
        "instance-0000000028 - background tasks",
      ],
      "271": Array [
        "instance-0000000029 - background tasks",
        "instance-0000000030 - background tasks",
      ],
      "272": Array [
        "instance-0000000031 - background tasks",
        "instance-0000000032 - background tasks",
      ],
      "273": Array [
        "instance-0000000033 - background tasks",
        "instance-0000000034 - background tasks",
      ],
      "274": Array [
        "instance-0000000035 - background tasks",
        "instance-0000000036 - background tasks",
      ],
      "275": Array [
        "instance-0000000037 - background tasks",
        "instance-0000000038 - background tasks",
      ],
      "276": Array [
        "instance-0000000039 - background tasks",
        "instance-0000000040 - background tasks",
      ],
      "277": Array [
        "instance-0000000041 - background tasks",
        "instance-0000000042 - background tasks",
      ],
      "278": Array [
        "instance-0000000043 - background tasks",
        "instance-0000000044 - background tasks",
      ],
      "279": Array [
        "instance-0000000045 - background tasks",
        "instance-0000000046 - background tasks",
      ],
      "28": Array [
        "instance-0000000055 - background tasks",
        "instance-0000000056 - background tasks",
      ],
      "280": Array [
        "instance-0000000047 - background tasks",
        "instance-0000000048 - background tasks",
      ],
      "281": Array [
        "instance-0000000049 - background tasks",
        "instance-0000000050 - background tasks",
      ],
      "282": Array [
        "instance-0000000051 - background tasks",
        "instance-0000000052 - background tasks",
      ],
      "283": Array [
        "instance-0000000053 - background tasks",
        "instance-0000000054 - background tasks",
      ],
      "284": Array [
        "instance-0000000055 - background tasks",
        "instance-0000000056 - background tasks",
      ],
      "285": Array [
        "instance-0000000057 - background tasks",
        "instance-0000000058 - background tasks",
      ],
      "286": Array [
        "instance-0000000059 - background tasks",
        "instance-0000000060 - background tasks",
      ],
      "287": Array [
        "instance-0000000061 - background tasks",
        "instance-0000000062 - background tasks",
      ],
      "288": Array [
        "instance-0000000063 - background tasks",
        "instance-0000000064 - background tasks",
      ],
      "289": Array [
        "instance-0000000001 - background tasks",
        "instance-0000000002 - background tasks",
      ],
      "29": Array [
        "instance-0000000057 - background tasks",
        "instance-0000000058 - background tasks",
      ],
      "290": Array [
        "instance-0000000003 - background tasks",
        "instance-0000000004 - background tasks",
      ],
      "291": Array [
        "instance-0000000005 - background tasks",
        "instance-0000000006 - background tasks",
      ],
      "292": Array [
        "instance-0000000007 - background tasks",
        "instance-0000000008 - background tasks",
      ],
      "293": Array [
        "instance-0000000009 - background tasks",
        "instance-0000000010 - background tasks",
      ],
      "294": Array [
        "instance-0000000011 - background tasks",
        "instance-0000000012 - background tasks",
      ],
      "295": Array [
        "instance-0000000013 - background tasks",
        "instance-0000000014 - background tasks",
      ],
      "296": Array [
        "instance-0000000015 - background tasks",
        "instance-0000000016 - background tasks",
      ],
      "297": Array [
        "instance-0000000017 - background tasks",
        "instance-0000000018 - background tasks",
      ],
      "298": Array [
        "instance-0000000019 - background tasks",
        "instance-0000000020 - background tasks",
      ],
      "299": Array [
        "instance-0000000021 - background tasks",
        "instance-0000000022 - background tasks",
      ],
      "3": Array [
        "instance-0000000005 - background tasks",
        "instance-0000000006 - background tasks",
      ],
      "30": Array [
        "instance-0000000059 - background tasks",
        "instance-0000000060 - background tasks",
      ],
      "300": Array [
        "instance-0000000023 - background tasks",
        "instance-0000000024 - background tasks",
      ],
      "301": Array [
        "instance-0000000025 - background tasks",
        "instance-0000000026 - background tasks",
      ],
      "302": Array [
        "instance-0000000027 - background tasks",
        "instance-0000000028 - background tasks",
      ],
      "303": Array [
        "instance-0000000029 - background tasks",
        "instance-0000000030 - background tasks",
      ],
      "304": Array [
        "instance-0000000031 - background tasks",
        "instance-0000000032 - background tasks",
      ],
      "305": Array [
        "instance-0000000033 - background tasks",
        "instance-0000000034 - background tasks",
      ],
      "306": Array [
        "instance-0000000035 - background tasks",
        "instance-0000000036 - background tasks",
      ],
      "307": Array [
        "instance-0000000037 - background tasks",
        "instance-0000000038 - background tasks",
      ],
      "308": Array [
        "instance-0000000039 - background tasks",
        "instance-0000000040 - background tasks",
      ],
      "309": Array [
        "instance-0000000041 - background tasks",
        "instance-0000000042 - background tasks",
      ],
      "31": Array [
        "instance-0000000061 - background tasks",
        "instance-0000000062 - background tasks",
      ],
      "310": Array [
        "instance-0000000043 - background tasks",
        "instance-0000000044 - background tasks",
      ],
      "311": Array [
        "instance-0000000045 - background tasks",
        "instance-0000000046 - background tasks",
      ],
      "312": Array [
        "instance-0000000047 - background tasks",
        "instance-0000000048 - background tasks",
      ],
      "313": Array [
        "instance-0000000049 - background tasks",
        "instance-0000000050 - background tasks",
      ],
      "314": Array [
        "instance-0000000051 - background tasks",
        "instance-0000000052 - background tasks",
      ],
      "315": Array [
        "instance-0000000053 - background tasks",
        "instance-0000000054 - background tasks",
      ],
      "316": Array [
        "instance-0000000055 - background tasks",
        "instance-0000000056 - background tasks",
      ],
      "317": Array [
        "instance-0000000057 - background tasks",
        "instance-0000000058 - background tasks",
      ],
      "318": Array [
        "instance-0000000059 - background tasks",
        "instance-0000000060 - background tasks",
      ],
      "319": Array [
        "instance-0000000061 - background tasks",
        "instance-0000000062 - background tasks",
      ],
      "32": Array [
        "instance-0000000063 - background tasks",
        "instance-0000000064 - background tasks",
      ],
      "320": Array [
        "instance-0000000063 - background tasks",
        "instance-0000000064 - background tasks",
      ],
      "321": Array [
        "instance-0000000001 - background tasks",
        "instance-0000000002 - background tasks",
      ],
      "322": Array [
        "instance-0000000003 - background tasks",
        "instance-0000000004 - background tasks",
      ],
      "323": Array [
        "instance-0000000005 - background tasks",
        "instance-0000000006 - background tasks",
      ],
      "324": Array [
        "instance-0000000007 - background tasks",
        "instance-0000000008 - background tasks",
      ],
      "325": Array [
        "instance-0000000009 - background tasks",
        "instance-0000000010 - background tasks",
      ],
      "326": Array [
        "instance-0000000011 - background tasks",
        "instance-0000000012 - background tasks",
      ],
      "327": Array [
        "instance-0000000013 - background tasks",
        "instance-0000000014 - background tasks",
      ],
      "328": Array [
        "instance-0000000015 - background tasks",
        "instance-0000000016 - background tasks",
      ],
      "329": Array [
        "instance-0000000017 - background tasks",
        "instance-0000000018 - background tasks",
      ],
      "33": Array [
        "instance-0000000001 - background tasks",
        "instance-0000000002 - background tasks",
      ],
      "330": Array [
        "instance-0000000019 - background tasks",
        "instance-0000000020 - background tasks",
      ],
      "331": Array [
        "instance-0000000021 - background tasks",
        "instance-0000000022 - background tasks",
      ],
      "332": Array [
        "instance-0000000023 - background tasks",
        "instance-0000000024 - background tasks",
      ],
      "333": Array [
        "instance-0000000025 - background tasks",
        "instance-0000000026 - background tasks",
      ],
      "334": Array [
        "instance-0000000027 - background tasks",
        "instance-0000000028 - background tasks",
      ],
      "335": Array [
        "instance-0000000029 - background tasks",
        "instance-0000000030 - background tasks",
      ],
      "336": Array [
        "instance-0000000031 - background tasks",
        "instance-0000000032 - background tasks",
      ],
      "337": Array [
        "instance-0000000033 - background tasks",
        "instance-0000000034 - background tasks",
      ],
      "338": Array [
        "instance-0000000035 - background tasks",
        "instance-0000000036 - background tasks",
      ],
      "339": Array [
        "instance-0000000037 - background tasks",
        "instance-0000000038 - background tasks",
      ],
      "34": Array [
        "instance-0000000003 - background tasks",
        "instance-0000000004 - background tasks",
      ],
      "340": Array [
        "instance-0000000039 - background tasks",
        "instance-0000000040 - background tasks",
      ],
      "341": Array [
        "instance-0000000041 - background tasks",
        "instance-0000000042 - background tasks",
      ],
      "342": Array [
        "instance-0000000043 - background tasks",
        "instance-0000000044 - background tasks",
      ],
      "343": Array [
        "instance-0000000045 - background tasks",
        "instance-0000000046 - background tasks",
      ],
      "344": Array [
        "instance-0000000047 - background tasks",
        "instance-0000000048 - background tasks",
      ],
      "345": Array [
        "instance-0000000049 - background tasks",
        "instance-0000000050 - background tasks",
      ],
      "346": Array [
        "instance-0000000051 - background tasks",
        "instance-0000000052 - background tasks",
      ],
      "347": Array [
        "instance-0000000053 - background tasks",
        "instance-0000000054 - background tasks",
      ],
      "348": Array [
        "instance-0000000055 - background tasks",
        "instance-0000000056 - background tasks",
      ],
      "349": Array [
        "instance-0000000057 - background tasks",
        "instance-0000000058 - background tasks",
      ],
      "35": Array [
        "instance-0000000005 - background tasks",
        "instance-0000000006 - background tasks",
      ],
      "350": Array [
        "instance-0000000059 - background tasks",
        "instance-0000000060 - background tasks",
      ],
      "351": Array [
        "instance-0000000061 - background tasks",
        "instance-0000000062 - background tasks",
      ],
      "352": Array [
        "instance-0000000063 - background tasks",
        "instance-0000000064 - background tasks",
      ],
      "353": Array [
        "instance-0000000001 - background tasks",
        "instance-0000000002 - background tasks",
      ],
      "354": Array [
        "instance-0000000003 - background tasks",
        "instance-0000000004 - background tasks",
      ],
      "355": Array [
        "instance-0000000005 - background tasks",
        "instance-0000000006 - background tasks",
      ],
      "356": Array [
        "instance-0000000007 - background tasks",
        "instance-0000000008 - background tasks",
      ],
      "357": Array [
        "instance-0000000009 - background tasks",
        "instance-0000000010 - background tasks",
      ],
      "358": Array [
        "instance-0000000011 - background tasks",
        "instance-0000000012 - background tasks",
      ],
      "359": Array [
        "instance-0000000013 - background tasks",
        "instance-0000000014 - background tasks",
      ],
      "36": Array [
        "instance-0000000007 - background tasks",
        "instance-0000000008 - background tasks",
      ],
      "360": Array [
        "instance-0000000015 - background tasks",
        "instance-0000000016 - background tasks",
      ],
      "37": Array [
        "instance-0000000009 - background tasks",
        "instance-0000000010 - background tasks",
      ],
      "38": Array [
        "instance-0000000011 - background tasks",
        "instance-0000000012 - background tasks",
      ],
      "39": Array [
        "instance-0000000013 - background tasks",
        "instance-0000000014 - background tasks",
      ],
      "4": Array [
        "instance-0000000007 - background tasks",
        "instance-0000000008 - background tasks",
      ],
      "40": Array [
        "instance-0000000015 - background tasks",
        "instance-0000000016 - background tasks",
      ],
      "41": Array [
        "instance-0000000017 - background tasks",
        "instance-0000000018 - background tasks",
      ],
      "42": Array [
        "instance-0000000019 - background tasks",
        "instance-0000000020 - background tasks",
      ],
      "43": Array [
        "instance-0000000021 - background tasks",
        "instance-0000000022 - background tasks",
      ],
      "44": Array [
        "instance-0000000023 - background tasks",
        "instance-0000000024 - background tasks",
      ],
      "45": Array [
        "instance-0000000025 - background tasks",
        "instance-0000000026 - background tasks",
      ],
      "46": Array [
        "instance-0000000027 - background tasks",
        "instance-0000000028 - background tasks",
      ],
      "47": Array [
        "instance-0000000029 - background tasks",
        "instance-0000000030 - background tasks",
      ],
      "48": Array [
        "instance-0000000031 - background tasks",
        "instance-0000000032 - background tasks",
      ],
      "49": Array [
        "instance-0000000033 - background tasks",
        "instance-0000000034 - background tasks",
      ],
      "5": Array [
        "instance-0000000009 - background tasks",
        "instance-0000000010 - background tasks",
      ],
      "50": Array [
        "instance-0000000035 - background tasks",
        "instance-0000000036 - background tasks",
      ],
      "51": Array [
        "instance-0000000037 - background tasks",
        "instance-0000000038 - background tasks",
      ],
      "52": Array [
        "instance-0000000039 - background tasks",
        "instance-0000000040 - background tasks",
      ],
      "53": Array [
        "instance-0000000041 - background tasks",
        "instance-0000000042 - background tasks",
      ],
      "54": Array [
        "instance-0000000043 - background tasks",
        "instance-0000000044 - background tasks",
      ],
      "55": Array [
        "instance-0000000045 - background tasks",
        "instance-0000000046 - background tasks",
      ],
      "56": Array [
        "instance-0000000047 - background tasks",
        "instance-0000000048 - background tasks",
      ],
      "57": Array [
        "instance-0000000049 - background tasks",
        "instance-0000000050 - background tasks",
      ],
      "58": Array [
        "instance-0000000051 - background tasks",
        "instance-0000000052 - background tasks",
      ],
      "59": Array [
        "instance-0000000053 - background tasks",
        "instance-0000000054 - background tasks",
      ],
      "6": Array [
        "instance-0000000011 - background tasks",
        "instance-0000000012 - background tasks",
      ],
      "60": Array [
        "instance-0000000055 - background tasks",
        "instance-0000000056 - background tasks",
      ],
      "61": Array [
        "instance-0000000057 - background tasks",
        "instance-0000000058 - background tasks",
      ],
      "62": Array [
        "instance-0000000059 - background tasks",
        "instance-0000000060 - background tasks",
      ],
      "63": Array [
        "instance-0000000061 - background tasks",
        "instance-0000000062 - background tasks",
      ],
      "64": Array [
        "instance-0000000063 - background tasks",
        "instance-0000000064 - background tasks",
      ],
      "65": Array [
        "instance-0000000001 - background tasks",
        "instance-0000000002 - background tasks",
      ],
      "66": Array [
        "instance-0000000003 - background tasks",
        "instance-0000000004 - background tasks",
      ],
      "67": Array [
        "instance-0000000005 - background tasks",
        "instance-0000000006 - background tasks",
      ],
      "68": Array [
        "instance-0000000007 - background tasks",
        "instance-0000000008 - background tasks",
      ],
      "69": Array [
        "instance-0000000009 - background tasks",
        "instance-0000000010 - background tasks",
      ],
      "7": Array [
        "instance-0000000013 - background tasks",
        "instance-0000000014 - background tasks",
      ],
      "70": Array [
        "instance-0000000011 - background tasks",
        "instance-0000000012 - background tasks",
      ],
      "71": Array [
        "instance-0000000013 - background tasks",
        "instance-0000000014 - background tasks",
      ],
      "72": Array [
        "instance-0000000015 - background tasks",
        "instance-0000000016 - background tasks",
      ],
      "73": Array [
        "instance-0000000017 - background tasks",
        "instance-0000000018 - background tasks",
      ],
      "74": Array [
        "instance-0000000019 - background tasks",
        "instance-0000000020 - background tasks",
      ],
      "75": Array [
        "instance-0000000021 - background tasks",
        "instance-0000000022 - background tasks",
      ],
      "76": Array [
        "instance-0000000023 - background tasks",
        "instance-0000000024 - background tasks",
      ],
      "77": Array [
        "instance-0000000025 - background tasks",
        "instance-0000000026 - background tasks",
      ],
      "78": Array [
        "instance-0000000027 - background tasks",
        "instance-0000000028 - background tasks",
      ],
      "79": Array [
        "instance-0000000029 - background tasks",
        "instance-0000000030 - background tasks",
      ],
      "8": Array [
        "instance-0000000015 - background tasks",
        "instance-0000000016 - background tasks",
      ],
      "80": Array [
        "instance-0000000031 - background tasks",
        "instance-0000000032 - background tasks",
      ],
      "81": Array [
        "instance-0000000033 - background tasks",
        "instance-0000000034 - background tasks",
      ],
      "82": Array [
        "instance-0000000035 - background tasks",
        "instance-0000000036 - background tasks",
      ],
      "83": Array [
        "instance-0000000037 - background tasks",
        "instance-0000000038 - background tasks",
      ],
      "84": Array [
        "instance-0000000039 - background tasks",
        "instance-0000000040 - background tasks",
      ],
      "85": Array [
        "instance-0000000041 - background tasks",
        "instance-0000000042 - background tasks",
      ],
      "86": Array [
        "instance-0000000043 - background tasks",
        "instance-0000000044 - background tasks",
      ],
      "87": Array [
        "instance-0000000045 - background tasks",
        "instance-0000000046 - background tasks",
      ],
      "88": Array [
        "instance-0000000047 - background tasks",
        "instance-0000000048 - background tasks",
      ],
      "89": Array [
        "instance-0000000049 - background tasks",
        "instance-0000000050 - background tasks",
      ],
      "9": Array [
        "instance-0000000017 - background tasks",
        "instance-0000000018 - background tasks",
      ],
      "90": Array [
        "instance-0000000051 - background tasks",
        "instance-0000000052 - background tasks",
      ],
      "91": Array [
        "instance-0000000053 - background tasks",
        "instance-0000000054 - background tasks",
      ],
      "92": Array [
        "instance-0000000055 - background tasks",
        "instance-0000000056 - background tasks",
      ],
      "93": Array [
        "instance-0000000057 - background tasks",
        "instance-0000000058 - background tasks",
      ],
      "94": Array [
        "instance-0000000059 - background tasks",
        "instance-0000000060 - background tasks",
      ],
      "95": Array [
        "instance-0000000061 - background tasks",
        "instance-0000000062 - background tasks",
      ],
      "96": Array [
        "instance-0000000063 - background tasks",
        "instance-0000000064 - background tasks",
      ],
      "97": Array [
        "instance-0000000001 - background tasks",
        "instance-0000000002 - background tasks",
      ],
      "98": Array [
        "instance-0000000003 - background tasks",
        "instance-0000000004 - background tasks",
      ],
      "99": Array [
        "instance-0000000005 - background tasks",
        "instance-0000000006 - background tasks",
      ],
    }
  `);
  const counts = getParititonCountByPod(allPods, allPartitions, 2);
  expect(counts).toMatchInlineSnapshot(`
    Object {
      "instance-0000000001 - background tasks": 12,
      "instance-0000000002 - background tasks": 12,
      "instance-0000000003 - background tasks": 12,
      "instance-0000000004 - background tasks": 12,
      "instance-0000000005 - background tasks": 12,
      "instance-0000000006 - background tasks": 12,
      "instance-0000000007 - background tasks": 12,
      "instance-0000000008 - background tasks": 12,
      "instance-0000000009 - background tasks": 12,
      "instance-0000000010 - background tasks": 12,
      "instance-0000000011 - background tasks": 12,
      "instance-0000000012 - background tasks": 12,
      "instance-0000000013 - background tasks": 12,
      "instance-0000000014 - background tasks": 12,
      "instance-0000000015 - background tasks": 12,
      "instance-0000000016 - background tasks": 12,
      "instance-0000000017 - background tasks": 11,
      "instance-0000000018 - background tasks": 11,
      "instance-0000000019 - background tasks": 11,
      "instance-0000000020 - background tasks": 11,
      "instance-0000000021 - background tasks": 11,
      "instance-0000000022 - background tasks": 11,
      "instance-0000000023 - background tasks": 11,
      "instance-0000000024 - background tasks": 11,
      "instance-0000000025 - background tasks": 11,
      "instance-0000000026 - background tasks": 11,
      "instance-0000000027 - background tasks": 11,
      "instance-0000000028 - background tasks": 11,
      "instance-0000000029 - background tasks": 11,
      "instance-0000000030 - background tasks": 11,
      "instance-0000000031 - background tasks": 11,
      "instance-0000000032 - background tasks": 11,
      "instance-0000000033 - background tasks": 11,
      "instance-0000000034 - background tasks": 11,
      "instance-0000000035 - background tasks": 11,
      "instance-0000000036 - background tasks": 11,
      "instance-0000000037 - background tasks": 11,
      "instance-0000000038 - background tasks": 11,
      "instance-0000000039 - background tasks": 11,
      "instance-0000000040 - background tasks": 11,
      "instance-0000000041 - background tasks": 11,
      "instance-0000000042 - background tasks": 11,
      "instance-0000000043 - background tasks": 11,
      "instance-0000000044 - background tasks": 11,
      "instance-0000000045 - background tasks": 11,
      "instance-0000000046 - background tasks": 11,
      "instance-0000000047 - background tasks": 11,
      "instance-0000000048 - background tasks": 11,
      "instance-0000000049 - background tasks": 11,
      "instance-0000000050 - background tasks": 11,
      "instance-0000000051 - background tasks": 11,
      "instance-0000000052 - background tasks": 11,
      "instance-0000000053 - background tasks": 11,
      "instance-0000000054 - background tasks": 11,
      "instance-0000000055 - background tasks": 11,
      "instance-0000000056 - background tasks": 11,
      "instance-0000000057 - background tasks": 11,
      "instance-0000000058 - background tasks": 11,
      "instance-0000000059 - background tasks": 11,
      "instance-0000000060 - background tasks": 11,
      "instance-0000000061 - background tasks": 11,
      "instance-0000000062 - background tasks": 11,
      "instance-0000000063 - background tasks": 11,
      "instance-0000000064 - background tasks": 11,
    }
  `);
});
