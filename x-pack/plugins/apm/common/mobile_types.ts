/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum MobilePropertyType {
  Device = 'device',
  NetworkConnectionType = 'netConnectionType',
  OsVersion = 'osVersion',
  AppVersion = 'appVersion',
}

export type MobilePropertyNctType = MobilePropertyType.NetworkConnectionType;

export type MobilePropertyDeviceOsAppVersionType =
  | MobilePropertyType.Device
  | MobilePropertyType.OsVersion
  | MobilePropertyType.AppVersion;
