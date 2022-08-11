/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataStream } from '../types';

import { httpNormalizers, HTTPNormalizerMap } from '../http/normalizers';
import { tcpNormalizers, TCPNormalizerMap } from '../tcp/normalizers';
import { icmpNormalizers, ICMPNormalizerMap } from '../icmp/normalizers';
import { browserNormalizers, BrowserNormalizerMap } from '../browser/normalizers';
import { commonNormalizers, CommonNormalizerMap } from '../common/normalizers';

type Normalizers = HTTPNormalizerMap &
  ICMPNormalizerMap &
  TCPNormalizerMap &
  BrowserNormalizerMap &
  CommonNormalizerMap;

interface NormalizerMap {
  [DataStream.HTTP]: HTTPNormalizerMap;
  [DataStream.ICMP]: ICMPNormalizerMap;
  [DataStream.TCP]: TCPNormalizerMap;
  [DataStream.BROWSER]: BrowserNormalizerMap;
}

export const normalizersMap: NormalizerMap = {
  [DataStream.HTTP]: httpNormalizers,
  [DataStream.ICMP]: icmpNormalizers,
  [DataStream.TCP]: tcpNormalizers,
  [DataStream.BROWSER]: browserNormalizers,
};

export const normalizers: Normalizers = {
  ...httpNormalizers,
  ...icmpNormalizers,
  ...tcpNormalizers,
  ...browserNormalizers,
  ...commonNormalizers,
};
