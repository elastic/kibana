/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { allowRequest } from './network_policy';

describe('Network Policy', () => {
  it('allows requests when there are no rules', () => {
    expect(allowRequest('https://kibana.com/cool/route/bro', [])).toEqual(true);
  });

  it('denies requests when no rules match', () => {
    const url = 'https://not-kibana.com/cool/route/bro';
    const rules = [{ allow: true, host: 'kibana.com' }];

    expect(allowRequest(url, rules)).toEqual(false);
  });

  it('allows requests when a rule matches', () => {
    const url = 'https://kibana.com/cool/route/bro';
    const rules = [{ allow: true, host: 'kibana.com' }, { allow: false }];

    expect(allowRequest(url, rules)).toEqual(true);
  });

  it('denies requests when a rule matches', () => {
    const url = 'https://bad.com/cool/route/bro';
    const rules = [{ allow: false, host: 'bad.com' }, { allow: true }];

    expect(allowRequest(url, rules)).toEqual(false);
  });

  it('allows complex rules', () => {
    const url = 'https://kibana.com/cool/route/bro';
    const rules = [{ allow: true, host: 'kibana.com', protocol: 'https:' }, { allow: false }];

    expect(allowRequest(url, rules)).toEqual(true);
  });

  it('denies complex rules', () => {
    const url = 'http://bad.com/cool/route/bro';
    const rules = [{ allow: false, host: 'bad.com', protocol: 'http:' }, { allow: false }];

    expect(allowRequest(url, rules)).toEqual(false);
  });

  it('allows requests when a rule does not match exactly', () => {
    const url = 'https://kibana.com/cool/route/bro';
    const rules = [{ allow: false, host: 'kibana.com', protocol: 'http:' }, { allow: true }];

    expect(allowRequest(url, rules)).toEqual(true);
  });

  it('denies requests when a rule does not match exactly', () => {
    const url = 'http://kibana.com/cool/route/bro';
    const rules = [{ allow: true, host: 'kibana.com', protocol: 'https:' }, { allow: false }];

    expect(allowRequest(url, rules)).toEqual(false);
  });

  it('allows requests when a rule is defined later', () => {
    const url = 'https://kibana.com/cool/route/bro';
    const rules = [{ allow: true, host: 'kibana.com' }, { allow: false }];

    expect(allowRequest(url, rules)).toEqual(true);
  });

  it('denies requests when a rule is defined later', () => {
    const url = 'https://kibana.com/cool/route/bro';
    const rules = [{ allow: false, host: 'kibana.com' }, { allow: true }];

    expect(allowRequest(url, rules)).toEqual(false);
  });

  it('allows requests when hosts are specific', () => {
    const url = 'https://www.kibana.com/cool/route/bro';
    const rules = [{ allow: true, host: 'www.kibana.com' }, { allow: false }];

    expect(allowRequest(url, rules)).toEqual(true);
  });

  it('denies requests when hosts are specific', () => {
    const url = 'https://bad.kibana.com/cool/route/bro';
    const rules = [{ allow: true, host: 'www.kibana.com' }, { allow: false }];

    expect(allowRequest(url, rules)).toEqual(false);
  });

  it('denies requests when hosts are similar but not exact', () => {
    const url = 'https://bad-kibana.com/cool/route/bro';
    const rules = [{ allow: true, host: 'kibana.com' }, { allow: false }];

    expect(allowRequest(url, rules)).toEqual(false);
  });

  it('allows requests when hosts are not specific', () => {
    const url = 'https://www.kibana.com/cool/route/bro';
    const rules = [{ allow: true, host: 'kibana.com' }, { allow: false }];

    expect(allowRequest(url, rules)).toEqual(true);
  });

  it('denies requests when hosts are not specific', () => {
    const url = 'https://www.kibana.com/cool/route/bro';
    const rules = [{ allow: false, host: 'kibana.com' }, { allow: true }];

    expect(allowRequest(url, rules)).toEqual(false);
  });

  it('allows requests when hosts are whitelisted IP addresses', () => {
    const url = 'http://192.168.1.1/cool/route/bro';
    const rules = [{ allow: true, host: '192.168.1.1' }, { allow: false }];

    expect(allowRequest(url, rules)).toEqual(true);
  });

  it('denies requests when hosts are blacklisted IP addresses', () => {
    const url = 'http://192.168.1.1/cool/route/bro';
    const rules = [{ allow: false, host: '192.168.1.1' }, { allow: true }];

    expect(allowRequest(url, rules)).toEqual(false);
  });

  it('allows requests when hosts are IP addresses not blacklisted', () => {
    const url = 'http://192.168.2.1/cool/route/bro';
    const rules = [{ allow: false, host: '192.168.1.1' }, { allow: true }];

    expect(allowRequest(url, rules)).toEqual(true);
  });

  it('denies requests when hosts are IP addresses not whitelisted', () => {
    const url = 'http://192.168.2.1/cool/route/bro';
    const rules = [{ allow: true, host: '192.168.1.1' }, { allow: false }];

    expect(allowRequest(url, rules)).toEqual(false);
  });

  describe('Common cases', () => {
    it('allows whitelisting of certain routes based upon protocol', () => {
      const rules = [
        { allow: true, host: 'kibana.com', protocol: 'http:' },
        { allow: true, protocol: 'https:' },
        { allow: false },
      ];

      expect(allowRequest('http://kibana.com/some/route', rules)).toEqual(true);
      expect(allowRequest('https://good.com/some/route', rules)).toEqual(true);
      expect(allowRequest('http://bad.com/some/route', rules)).toEqual(false);
    });

    it('allows blacklisting of certain IPs', () => {
      const rules = [{ allow: false, host: '169.254.0.0' }, { allow: true }];

      expect(allowRequest('http://kibana.com/some/route', rules)).toEqual(true);
      expect(allowRequest('http://bad.com/some/route', rules)).toEqual(true);
      expect(allowRequest('https://169.254.0.0/some/route', rules)).toEqual(false);
    });

    it('allows whitelisting a single host on https', () => {
      const rules = [{ allow: true, host: 'kibana.com', protocol: 'https:' }, { allow: false }];

      expect(allowRequest('http://kibana.com/some/route', rules)).toEqual(false);
      expect(allowRequest('http://bad.com/some/route', rules)).toEqual(false);
      expect(allowRequest('https://kibana.com/some/route', rules)).toEqual(true);
    });

    it('allows whitelisting a single protocol to http', () => {
      const rules = [{ allow: true, protocol: 'https:' }, { allow: false }];

      expect(allowRequest('http://kibana.com/some/route', rules)).toEqual(false);
      expect(allowRequest('http://bad.com/some/route', rules)).toEqual(false);
      expect(allowRequest('https://good.com/some/route', rules)).toEqual(true);
    });

    it('allows whitelisting a single domain', () => {
      const rules = [{ allow: true, host: 'kibana.com' }, { allow: false }];

      expect(allowRequest('http://kibana.com/some/route', rules)).toEqual(true);
      expect(allowRequest('http://www.kibana.com/some/route', rules)).toEqual(true);
      expect(allowRequest('https://www-kibana.com/some/route', rules)).toEqual(false);
    });

    it('can blacklist bad protocols', () => {
      const rules = [
        { allow: true, protocol: 'http:' },
        { allow: true, protocol: 'https:' },
        { allow: true, protocol: 'ws:' },
        { allow: true, protocol: 'wss:' },
        { allow: true, protocol: 'data:' },
        { allow: false },
      ];

      expect(allowRequest('http://kibana.com/some/route', rules)).toEqual(true);
      expect(allowRequest('https://www.kibana.com/some/route', rules)).toEqual(true);
      expect(allowRequest('file:///etc/passwd', rules)).toEqual(false);
    });

    it('can shoot you in the foot', () => {
      const rules = [{ allow: false }];

      expect(allowRequest('http://kibana.com/some/route', rules)).toEqual(false);
      expect(allowRequest('http://www.kibana.com/some/route', rules)).toEqual(false);
      expect(allowRequest('https://www-kibana.com/some/route', rules)).toEqual(false);
    });
  });
});
