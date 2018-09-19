/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint max-len: 0 */
/* eslint quotes: 0 */

export const savedObjects = [
  {
    "id": "4cef51e0-bbb4-11e8-bef2-c924ce0878e2",
    "type": "visualization",
    "version": 1,
    "attributes": {
      "title": "goto GIS app",
      "visState": "{\"title\":\"goto GIS app\",\"type\":\"markdown\",\"params\":{\"fontSize\":12,\"openLinksInNewTab\":false,\"markdown\":\"The Kentucky salt truck sample data contains several geospatial indices to provide a demo of Kibana's new GIS application. \\n\\n[Click here to open the GIS application](gis)\"},\"aggs\":[]}",
      "uiStateJSON": "{}",
      "description": "",
      "version": 1,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[]}"
      }
    }
  },
  {
    "id": "6d9ccc60-bbb4-11e8-bef2-c924ce0878e2",
    "type": "dashboard",
    "version": 1,
    "attributes": {
      "title": "ky_salt_truck_dash",
      "hits": 0,
      "description": "",
      "panelsJSON": "[{\"gridData\":{\"x\":0,\"y\":0,\"w\":48,\"h\":21,\"i\":\"1\"},\"version\":\"7.0.0-alpha1\",\"panelIndex\":\"1\",\"type\":\"visualization\",\"id\":\"4cef51e0-bbb4-11e8-bef2-c924ce0878e2\",\"embeddableConfig\":{}}]",
      "optionsJSON": "{\"darkTheme\":true,\"useMargins\":true,\"hidePanelTitles\":true}",
      "version": 1,
      "timeRestore": false,
      "kibanaSavedObjectMeta": {
        "searchSourceJSON": "{\"query\":{\"query\":\"\",\"language\":\"lucene\"},\"filter\":[]}"
      }
    }
  },
  {
    "id": "6e853b20-bbb5-11e8-88aa-9d8656848e00",
    "type": "index-pattern",
    "attributes": {
      "title": "kibana_sample_data_ky_counties",
      "fields": "[{\"name\":\"AFFGEOID\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"ALAND\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"AWATER\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"COUNTYFP\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"COUNTYNS\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"GEOID\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"LSAD\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"NAME\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"STATEFP\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":true},{\"name\":\"_id\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false},{\"name\":\"_index\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false},{\"name\":\"_score\",\"type\":\"number\",\"count\":0,\"scripted\":false,\"searchable\":false,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"_source\",\"type\":\"_source\",\"count\":0,\"scripted\":false,\"searchable\":false,\"aggregatable\":false,\"readFromDocValues\":false},{\"name\":\"_type\",\"type\":\"string\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":true,\"readFromDocValues\":false},{\"name\":\"geometry\",\"type\":\"geo_shape\",\"count\":0,\"scripted\":false,\"searchable\":true,\"aggregatable\":false,\"readFromDocValues\":false}]"
    }
  }
];
