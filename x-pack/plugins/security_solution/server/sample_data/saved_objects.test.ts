/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSavedObjects } from './saved_objects';
import type { SavedObject } from '@kbn/core/server';

describe('getSavedObjects', () => {
  let results: Array<SavedObject<{ panelsJSON: string }>>;
  beforeAll(() => {
    results = getSavedObjects('test') as Array<SavedObject<{ panelsJSON: string }>>;
  });
  it('returns a data view saved objects', () => {
    expect(results[0].id).toEqual('7e483f93-0c84-48e0-9a32-8799a7cfdc26');
    expect(results[0].type).toEqual('index-pattern');
    expect(results[0].attributes).toMatchSnapshot(`
      Object {
        "fieldAttrs": "{}",
        "fieldFormatMap": "{}",
        "fields": "[]",
        "name": "[Security Solution] Kibana Sample Data Security Solution",
        "runtimeFieldMap": "{}",
        "sourceFilters": "[]",
        "timeFieldName": "@timestamp",
        "title": "kibana_sample_data_securitysolution_*",
        "typeMeta": "{}",
      }
    `);
  });

  it('returns a search saved objects', () => {
    expect(results[1].id).toEqual(`d74dd00d-1f54-42ca-ae61-a37804c0a826`);
    expect(results[1].type).toEqual('search');
    expect(results[1].attributes).toMatchSnapshot(`
      Object {
        "columns": Array [
          "agent.type",
          "ecs.version",
          "event.kind",
          "host.hostname",
        ],
        "description": "",
        "grid": Object {},
        "hideChart": false,
        "isTextBasedQuery": false,
        "kibanaSavedObjectMeta": Object {
          "searchSourceJSON": "{\\"highlightAll\\":true,\\"version\\":true,\\"query\\":{\\"query\\":\\"\\",\\"language\\":\\"kuery\\"},\\"filter\\":[],\\"indexRefName\\":\\"kibanaSavedObjectMeta.searchSourceJSON.index\\"}",
        },
        "sort": Array [
          Array [
            "@timestamp",
            "desc",
          ],
        ],
        "timeRestore": false,
        "title": "[Security Solution] Security Solution Sample data",
        "usesAdHocDataView": false,
      }
    `);
    expect(results[1].references).toMatchSnapshot(`
      Array [
        Object {
          "id": "c89b196d-d0cd-4cfb-8d95-787e4ce51551",
          "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
          "type": "index-pattern",
        },
      ]
    `);
  });

  it('returns a dashboard saved objects', () => {
    expect(results[2].id).toEqual('6b348ca0-4e45-11ee-8ec1-71bbd0b34722');
    expect(results[2].type).toEqual('dashboard');
    expect(results[2].references.length).toEqual(22);
    expect(results[2].references).toMatchSnapshot();
  });

  it('returns a dashboard contains "Security Solution hosts metric"', () => {
    expect(JSON.parse(results[2].attributes.panelsJSON)[0].title).toEqual(
      `Security Solution hosts metric`
    );
    expect(JSON.parse(results[2].attributes.panelsJSON)[0].type).toEqual(`lens`);
    expect(JSON.parse(results[2].attributes.panelsJSON)[0]).toMatchSnapshot();
  });

  it('returns a dashboard contains "Security Solution sample data network events"', () => {
    expect(JSON.parse(results[2].attributes.panelsJSON)[1].title).toEqual(
      `Security Solution sample data network events`
    );
    expect(JSON.parse(results[2].attributes.panelsJSON)[1].type).toEqual(`lens`);
    expect(JSON.parse(results[2].attributes.panelsJSON)[1]).toMatchSnapshot();
  });

  it('returns a dashboard contains "Security Solution sample data DNS queries"', () => {
    expect(JSON.parse(results[2].attributes.panelsJSON)[2].title).toEqual(
      `Security Solution sample data DNS queries`
    );
    expect(JSON.parse(results[2].attributes.panelsJSON)[2].type).toEqual(`lens`);
    expect(JSON.parse(results[2].attributes.panelsJSON)[2]).toMatchSnapshot();
  });

  it('returns a dashboard contains "Security Solution sample data users"', () => {
    expect(JSON.parse(results[2].attributes.panelsJSON)[3].title).toEqual(
      `Security Solution sample data users`
    );
    expect(JSON.parse(results[2].attributes.panelsJSON)[3].type).toEqual(`lens`);

    expect(JSON.parse(results[2].attributes.panelsJSON)[3]).toMatchSnapshot();
  });

  it('returns a dashboard contains "Security Solution sample data unique source ip"', () => {
    expect(JSON.parse(results[2].attributes.panelsJSON)[4].title).toEqual(
      `Security Solution sample data unique source ip`
    );
    expect(JSON.parse(results[2].attributes.panelsJSON)[4].type).toEqual(`lens`);
  });

  it('returns a dashboard contains "Security Solution sample data unique destination ip"', () => {
    expect(JSON.parse(results[2].attributes.panelsJSON)[5]).toMatchSnapshot();

    expect(JSON.parse(results[2].attributes.panelsJSON)[5].title).toEqual(
      `Security Solution sample data unique destination ip`
    );
    expect(JSON.parse(results[2].attributes.panelsJSON)[5].type).toEqual(`lens`);
  });

  it('returns a dashboard contains "Security Solution sample data user authentications success"', () => {
    expect(JSON.parse(results[2].attributes.panelsJSON)[6]).toMatchSnapshot();

    expect(JSON.parse(results[2].attributes.panelsJSON)[6].title).toEqual(
      `Security Solution sample data user authentications success`
    );
    expect(JSON.parse(results[2].attributes.panelsJSON)[6].type).toEqual(`lens`);
  });

  it('returns a dashboard contains "Security Solution sample data user authentications failure"', () => {
    expect(JSON.parse(results[2].attributes.panelsJSON)[7]).toMatchSnapshot();

    expect(JSON.parse(results[2].attributes.panelsJSON)[7].title).toEqual(
      `Security Solution sample data user authentication failure`
    );
    expect(JSON.parse(results[2].attributes.panelsJSON)[7].type).toEqual(`lens`);
  });

  it('returns a dashboard contains "Security Solution sample alerts data"', () => {
    expect(JSON.parse(results[2].attributes.panelsJSON)[8].embeddableConfig).toMatchSnapshot();

    expect(
      JSON.parse(results[2].attributes.panelsJSON)[8].embeddableConfig.attributes.title
    ).toEqual(`Security Solution sample alerts data`);
    expect(JSON.parse(results[2].attributes.panelsJSON)[8].type).toEqual(`lens`);
  });

  it('returns a dashboard contains "Security Solution sample events by dataset"', () => {
    expect(JSON.parse(results[2].attributes.panelsJSON)[9]).toMatchSnapshot();

    expect(JSON.parse(results[2].attributes.panelsJSON)[9].title).toEqual(
      `Security Solution sample events by dataset`
    );
    expect(JSON.parse(results[2].attributes.panelsJSON)[9].type).toEqual(`lens`);
  });

  it('returns a dashboard contains "Security Solution sample events by actions"', () => {
    expect(JSON.parse(results[2].attributes.panelsJSON)[10]).toMatchSnapshot();

    expect(JSON.parse(results[2].attributes.panelsJSON)[10].title).toEqual(
      `Security Solution sample data events by actions`
    );
    expect(JSON.parse(results[2].attributes.panelsJSON)[10].type).toEqual(`lens`);
  });

  it('returns a dashboard contains "Security Solution sample data unique IPs"', () => {
    expect(JSON.parse(results[2].attributes.panelsJSON)[11]).toMatchSnapshot();
    expect(JSON.parse(results[2].attributes.panelsJSON)[11].title).toEqual(
      `Security Solution sample data unique IPs`
    );
    expect(JSON.parse(results[2].attributes.panelsJSON)[11].type).toEqual(`lens`);
  });

  it('returns a dashboard contains "Security Solution sample data user authentications area chart"', () => {
    expect(JSON.parse(results[2].attributes.panelsJSON)[12]).toMatchSnapshot();
    expect(JSON.parse(results[2].attributes.panelsJSON)[12].title).toEqual(
      `Security Solution sample data user authentications area chart`
    );
    expect(JSON.parse(results[2].attributes.panelsJSON)[12].type).toEqual(`lens`);
  });

  it('returns a dashboard contains "Security Solution sample data user authentications"', () => {
    expect(JSON.parse(results[2].attributes.panelsJSON)[13]).toMatchSnapshot();
    expect(JSON.parse(results[2].attributes.panelsJSON)[13].title).toEqual(
      `Security Solution sample data user authentications`
    );
    expect(JSON.parse(results[2].attributes.panelsJSON)[13].type).toEqual(`lens`);
  });

  it('returns a dashboard contains "Security Solution sample data host area chart"', () => {
    expect(JSON.parse(results[2].attributes.panelsJSON)[14]).toMatchSnapshot();
    expect(JSON.parse(results[2].attributes.panelsJSON)[14].title).toEqual(
      `Security Solution sample data host area chart`
    );
    expect(JSON.parse(results[2].attributes.panelsJSON)[14].type).toEqual(`lens`);
  });

  it('returns a dashboard contains "Security Solution sample data unique IPs area chart"', () => {
    expect(JSON.parse(results[2].attributes.panelsJSON)[15]).toMatchSnapshot();
    expect(JSON.parse(results[2].attributes.panelsJSON)[15].title).toEqual(
      `Security Solution sample data unique IPs area chart`
    );
    expect(JSON.parse(results[2].attributes.panelsJSON)[15].type).toEqual(`lens`);
  });

  it('returns a dashboard contains "Security Solution sample data"', () => {
    expect(JSON.parse(results[2].attributes.panelsJSON)[16]).toMatchSnapshot();
    expect(JSON.parse(results[2].attributes.panelsJSON)[16].title).toEqual(
      `Security Solution sample data`
    );
    expect(JSON.parse(results[2].attributes.panelsJSON)[16].type).toEqual(`search`);
  });
});
