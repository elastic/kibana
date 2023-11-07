/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('node-fetch');
import fetch from 'node-fetch';
const { Response } = jest.requireActual('node-fetch');
import { getJavaAgentVersionsFromRegistry } from './get_java_agent_versions';

const javaVersionsXML = `<?xml version="1.0" encoding="UTF-8"?>
<metadata>
  <groupId>co.elastic.apm</groupId>
  <artifactId>elastic-apm-agent</artifactId>
  <versioning>
    <latest>1.32.0</latest>
    <release>1.32.0</release>
    <versions>
      <version>1.30.1</version>
      <version>1.31.0</version>
      <version>1.32.0</version>
    </versions>
    <lastUpdated>20220613135218</lastUpdated>
  </versioning>
</metadata>
`;

describe('getJavaAgentVersionsFromRegistry', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
  describe('With valid API return type', () => {
    it('returns latest as first option', async () => {
      mockFetch.mockReturnValue(new Response(javaVersionsXML));
      const versions = await getJavaAgentVersionsFromRegistry();
      expect(versions?.[0]).toEqual('latest');
    });

    it('returns versions in descending order', async () => {
      mockFetch.mockReturnValue(new Response(javaVersionsXML));
      const versions = await getJavaAgentVersionsFromRegistry();
      expect(versions).toEqual(['latest', '1.32.0', '1.31.0', '1.30.1']);
    });
  });

  describe('With invalid API return type', () => {
    it('returns versions in descending order', async () => {
      mockFetch.mockReturnValue(new Response(`404`));
      const versions = await getJavaAgentVersionsFromRegistry();
      expect(versions).toBeUndefined();
    });
  });
});
