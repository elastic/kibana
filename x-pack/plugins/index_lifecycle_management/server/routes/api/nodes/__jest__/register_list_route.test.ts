/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { convertSettingsIntoLists } from '../register_list_route';
import { cloudNodeSettingsWithLegacy, cloudNodeSettingsWithoutLegacy } from './fixtures';

describe('convertSettingsIntoLists', () => {
  it('detects node role config', () => {
    const result = convertSettingsIntoLists(cloudNodeSettingsWithoutLegacy, []);
    expect(result.isUsingDeprecatedDataRoleConfig).toBe(false);
  });

  it('converts cloud settings into the expected response and detects deprecated config', () => {
    const result = convertSettingsIntoLists(cloudNodeSettingsWithLegacy, []);

    expect(result.isUsingDeprecatedDataRoleConfig).toBe(true);
    expect(result.nodesByRoles).toEqual({
      data: [
        't49k7mdeRIiELuOt_MOZ1g',
        'ZVndRfrfSl-kmEyZgJu0JQ',
        'Tx8Xig60SIuitXhY0srD6Q',
        'Qtpmy7aBSIaOZisv9Q92TA',
      ],
    });
    expect(result.nodesByAttributes).toMatchInlineSnapshot(`
      Object {
        "availability_zone:europe-west4-a": Array [
          "ZVndRfrfSl-kmEyZgJu0JQ",
          "Tx8Xig60SIuitXhY0srD6Q",
        ],
        "availability_zone:europe-west4-b": Array [
          "SgaCpsXAQu-oTsP4iLGZWw",
        ],
        "availability_zone:europe-west4-c": Array [
          "t49k7mdeRIiELuOt_MOZ1g",
          "Qtpmy7aBSIaOZisv9Q92TA",
        ],
        "data:hot": Array [
          "SgaCpsXAQu-oTsP4iLGZWw",
          "ZVndRfrfSl-kmEyZgJu0JQ",
          "Qtpmy7aBSIaOZisv9Q92TA",
        ],
        "data:warm": Array [
          "t49k7mdeRIiELuOt_MOZ1g",
          "Tx8Xig60SIuitXhY0srD6Q",
        ],
        "instance_configuration:gcp.data.highio.1": Array [
          "ZVndRfrfSl-kmEyZgJu0JQ",
          "Qtpmy7aBSIaOZisv9Q92TA",
        ],
        "instance_configuration:gcp.data.highstorage.1": Array [
          "t49k7mdeRIiELuOt_MOZ1g",
          "Tx8Xig60SIuitXhY0srD6Q",
        ],
        "instance_configuration:gcp.master.1": Array [
          "SgaCpsXAQu-oTsP4iLGZWw",
        ],
        "logical_availability_zone:tiebreaker": Array [
          "SgaCpsXAQu-oTsP4iLGZWw",
        ],
        "logical_availability_zone:zone-0": Array [
          "t49k7mdeRIiELuOt_MOZ1g",
          "Qtpmy7aBSIaOZisv9Q92TA",
        ],
        "logical_availability_zone:zone-1": Array [
          "ZVndRfrfSl-kmEyZgJu0JQ",
          "Tx8Xig60SIuitXhY0srD6Q",
        ],
        "region:unknown-region": Array [
          "t49k7mdeRIiELuOt_MOZ1g",
          "SgaCpsXAQu-oTsP4iLGZWw",
          "ZVndRfrfSl-kmEyZgJu0JQ",
          "Tx8Xig60SIuitXhY0srD6Q",
          "Qtpmy7aBSIaOZisv9Q92TA",
        ],
        "server_name:instance-0000000000.6ee9547c30214d278d2a63c4de98dea5": Array [
          "Qtpmy7aBSIaOZisv9Q92TA",
        ],
        "server_name:instance-0000000001.6ee9547c30214d278d2a63c4de98dea5": Array [
          "ZVndRfrfSl-kmEyZgJu0JQ",
        ],
        "server_name:instance-0000000002.6ee9547c30214d278d2a63c4de98dea5": Array [
          "t49k7mdeRIiELuOt_MOZ1g",
        ],
        "server_name:instance-0000000003.6ee9547c30214d278d2a63c4de98dea5": Array [
          "Tx8Xig60SIuitXhY0srD6Q",
        ],
        "server_name:tiebreaker-0000000004.6ee9547c30214d278d2a63c4de98dea5": Array [
          "SgaCpsXAQu-oTsP4iLGZWw",
        ],
        "transform.node:false": Array [
          "SgaCpsXAQu-oTsP4iLGZWw",
        ],
        "transform.node:true": Array [
          "t49k7mdeRIiELuOt_MOZ1g",
          "ZVndRfrfSl-kmEyZgJu0JQ",
          "Tx8Xig60SIuitXhY0srD6Q",
          "Qtpmy7aBSIaOZisv9Q92TA",
        ],
        "xpack.installed:true": Array [
          "t49k7mdeRIiELuOt_MOZ1g",
          "SgaCpsXAQu-oTsP4iLGZWw",
          "ZVndRfrfSl-kmEyZgJu0JQ",
          "Tx8Xig60SIuitXhY0srD6Q",
          "Qtpmy7aBSIaOZisv9Q92TA",
        ],
      }
    `);
  });
});
