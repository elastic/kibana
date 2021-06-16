/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCaseUrl, wrapError } from './utils';
import { isBoom, boomify } from '@hapi/boom';

describe('Utils', () => {
  describe('wrapError', () => {
    it('wraps an error', () => {
      const error = new Error('Something happened');
      const res = wrapError(error);

      expect(isBoom(res.body as Error)).toBe(true);
    });

    it('it set statusCode to 500', () => {
      const error = new Error('Something happened');
      const res = wrapError(error);

      expect(res.statusCode).toBe(500);
    });

    it('it set statusCode to errors status code', () => {
      const error = new Error('Something happened') as any;
      error.statusCode = 404;
      const res = wrapError(error);

      expect(res.statusCode).toBe(404);
    });

    it('it accepts a boom error', () => {
      const error = boomify(new Error('Something happened'));
      const res = wrapError(error);

      // Utils returns the same boom error as body
      expect(res.body).toBe(error);
    });

    it('it accepts a boom error with status code', () => {
      const error = boomify(new Error('Something happened'), { statusCode: 404 });
      const res = wrapError(error);

      expect(res.statusCode).toBe(404);
    });

    it('it returns empty headers', () => {
      const error = new Error('Something happened');
      const res = wrapError(error);

      expect(res.headers).toEqual({});
    });
  });
  describe('getCaseUrl', () => {
    const caseId = '12345';
    const baseUrl = 'https://kibana.comma/app/security';
    const baseObsUrl = 'https://kibana.comma/app/observability';
    const mockUrlState =
      '?sourcerer=(default:!(%27auditbeat-*%27))&timerange=(global:(linkTo:!(timeline),timerange:(from:%272021-06-15T06:00:00.000Z%27,fromStr:now%2Fd,kind:relative,to:%272021-06-16T05:59:59.999Z%27,toStr:now%2Fd)),timeline:(linkTo:!(global),timerange:(from:%272021-06-15T06:00:00.000Z%27,fromStr:now%2Fd,kind:relative,to:%272021-06-16T05:59:59.999Z%27,toStr:now%2Fd)))';
    const createUrl = `${baseUrl}/cases/create`;
    const detectionsUrl = `${baseUrl}/detections`;
    const caseUrl = `${baseUrl}/cases/12345`;
    const createObsUrl = `${baseObsUrl}/cases/create`;
    const overviewObsUrl = `${baseObsUrl}/overview`;
    const caseObsUrl = `${baseObsUrl}/cases/12345`;
    describe('security urls', () => {
      it('gets case details url from base url', () => {
        const result = getCaseUrl(`${baseUrl}${mockUrlState}`, caseId);
        expect(result).toEqual(caseUrl);
      });
      it('gets case details url from case details link', () => {
        const result = getCaseUrl(`${caseUrl}${mockUrlState}`, caseId);
        expect(result).toEqual(caseUrl);
      });
      it('gets case details url from create link', () => {
        const result = getCaseUrl(`${createUrl}${mockUrlState}`, caseId);
        expect(result).toEqual(caseUrl);
      });
      it('gets case details url from detections link', () => {
        const result = getCaseUrl(`${detectionsUrl}${mockUrlState}`, caseId);
        expect(result).toEqual(caseUrl);
      });
    });
    describe('observability urls', () => {
      it('gets case details url from base url', () => {
        const result = getCaseUrl(`${baseObsUrl}${mockUrlState}`, caseId);
        expect(result).toEqual(caseObsUrl);
      });
      it('gets case details url from case details link', () => {
        const result = getCaseUrl(`${caseObsUrl}${mockUrlState}`, caseId);
        expect(result).toEqual(caseObsUrl);
      });
      it('gets case details url from create link', () => {
        const result = getCaseUrl(`${createObsUrl}${mockUrlState}`, caseId);
        expect(result).toEqual(caseObsUrl);
      });
      it('gets case details url from detections link', () => {
        const result = getCaseUrl(`${overviewObsUrl}${mockUrlState}`, caseId);
        expect(result).toEqual(caseObsUrl);
      });
    });
    describe('bad urls', () => {
      it('returns null from random link', () => {
        const result = getCaseUrl(`https://not-an-offical-kibana.com`, caseId);
        expect(result).toEqual(null);
      });
      it('non security/obs app', () => {
        const result = getCaseUrl(`'https://kibana.comma/app/uptime'`, caseId);
        expect(result).toEqual(null);
      });
    });
  });
});
