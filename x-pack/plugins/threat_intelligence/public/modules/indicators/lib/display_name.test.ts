/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { threatIndicatorNamesOriginScript, threatIndicatorNamesScript } from './display_name';

describe('display name generation', () => {
  describe('threatIndicatorNamesScript()', () => {
    it('should generate a valid painless script', () => {
      expect(threatIndicatorNamesScript()).toMatchInlineSnapshot(`
        "if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='ipv4-addr') { if (doc['threat.indicator.ip'].size()!=0 && doc['threat.indicator.ip'].value!=null) { return emit(doc['threat.indicator.ip'].value) } }
        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='ipv6-addr') { if (doc['threat.indicator.ip'].size()!=0 && doc['threat.indicator.ip'].value!=null) { return emit(doc['threat.indicator.ip'].value) } }

        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='file') { if (doc['threat.indicator.file.hash.sha256'].size()!=0 && doc['threat.indicator.file.hash.sha256'].value!=null) { return emit(doc['threat.indicator.file.hash.sha256'].value) }
        if (doc['threat.indicator.file.hash.md5'].size()!=0 && doc['threat.indicator.file.hash.md5'].value!=null) { return emit(doc['threat.indicator.file.hash.md5'].value) }
        if (doc['threat.indicator.file.hash.sha1'].size()!=0 && doc['threat.indicator.file.hash.sha1'].value!=null) { return emit(doc['threat.indicator.file.hash.sha1'].value) }
        if (doc['threat.indicator.file.hash.sha224'].size()!=0 && doc['threat.indicator.file.hash.sha224'].value!=null) { return emit(doc['threat.indicator.file.hash.sha224'].value) }
        if (doc['threat.indicator.file.hash.sha3-224'].size()!=0 && doc['threat.indicator.file.hash.sha3-224'].value!=null) { return emit(doc['threat.indicator.file.hash.sha3-224'].value) }
        if (doc['threat.indicator.file.hash.sha3-256'].size()!=0 && doc['threat.indicator.file.hash.sha3-256'].value!=null) { return emit(doc['threat.indicator.file.hash.sha3-256'].value) }
        if (doc['threat.indicator.file.hash.sha384'].size()!=0 && doc['threat.indicator.file.hash.sha384'].value!=null) { return emit(doc['threat.indicator.file.hash.sha384'].value) }
        if (doc['threat.indicator.file.hash.sha3-384'].size()!=0 && doc['threat.indicator.file.hash.sha3-384'].value!=null) { return emit(doc['threat.indicator.file.hash.sha3-384'].value) }
        if (doc['threat.indicator.file.hash.sha512'].size()!=0 && doc['threat.indicator.file.hash.sha512'].value!=null) { return emit(doc['threat.indicator.file.hash.sha512'].value) }
        if (doc['threat.indicator.file.hash.sha3-512'].size()!=0 && doc['threat.indicator.file.hash.sha3-512'].value!=null) { return emit(doc['threat.indicator.file.hash.sha3-512'].value) }
        if (doc['threat.indicator.file.hash.sha512/224'].size()!=0 && doc['threat.indicator.file.hash.sha512/224'].value!=null) { return emit(doc['threat.indicator.file.hash.sha512/224'].value) }
        if (doc['threat.indicator.file.hash.sha512/256'].size()!=0 && doc['threat.indicator.file.hash.sha512/256'].value!=null) { return emit(doc['threat.indicator.file.hash.sha512/256'].value) }
        if (doc['threat.indicator.file.ssdeep'].size()!=0 && doc['threat.indicator.file.ssdeep'].value!=null) { return emit(doc['threat.indicator.file.ssdeep'].value) }
        if (doc['threat.indicator.file.tlsh'].size()!=0 && doc['threat.indicator.file.tlsh'].value!=null) { return emit(doc['threat.indicator.file.tlsh'].value) }
        if (doc['threat.indicator.file.impfuzzy'].size()!=0 && doc['threat.indicator.file.impfuzzy'].value!=null) { return emit(doc['threat.indicator.file.impfuzzy'].value) }
        if (doc['threat.indicator.file.imphash'].size()!=0 && doc['threat.indicator.file.imphash'].value!=null) { return emit(doc['threat.indicator.file.imphash'].value) }
        if (doc['threat.indicator.file.pehash'].size()!=0 && doc['threat.indicator.file.pehash'].value!=null) { return emit(doc['threat.indicator.file.pehash'].value) }
        if (doc['threat.indicator.file.vhash'].size()!=0 && doc['threat.indicator.file.vhash'].value!=null) { return emit(doc['threat.indicator.file.vhash'].value) } }

        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='url') { if (doc['threat.indicator.url.full'].size()!=0 && doc['threat.indicator.url.full'].value!=null) { return emit(doc['threat.indicator.url.full'].value) } }

        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='domain') { if (doc['threat.indicator.url.domain'].size()!=0 && doc['threat.indicator.url.domain'].value!=null) { return emit(doc['threat.indicator.url.domain'].value) } }
        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='domain-name') { if (doc['threat.indicator.url.domain'].size()!=0 && doc['threat.indicator.url.domain'].value!=null) { return emit(doc['threat.indicator.url.domain'].value) } }

        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='x509-certificate') { if (doc['threat.indicator.x509.serial_number'].size()!=0 && doc['threat.indicator.x509.serial_number'].value!=null) { return emit(doc['threat.indicator.x509.serial_number'].value) } }
        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='x509 serial') { if (doc['threat.indicator.x509.serial_number'].size()!=0 && doc['threat.indicator.x509.serial_number'].value!=null) { return emit(doc['threat.indicator.x509.serial_number'].value) } }

        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='email-addr') { if (doc['threat.indicator.email.address'].size()!=0 && doc['threat.indicator.email.address'].value!=null) { return emit(doc['threat.indicator.email.address'].value) } }

        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='unknown') { if (doc['_id'].size()!=0 && doc['_id'].value!=null) { return emit(doc['_id'].value) } }
        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='email') { if (doc['_id'].size()!=0 && doc['_id'].value!=null) { return emit(doc['_id'].value) } }
        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='email-message') { if (doc['_id'].size()!=0 && doc['_id'].value!=null) { return emit(doc['_id'].value) } }

        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='windows-registry-key') { if (doc['threat.indicator.registry.key'].size()!=0 && doc['threat.indicator.registry.key'].value!=null) { return emit(doc['threat.indicator.registry.key'].value) } }

        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='autonomous-system') { if (doc['threat.indicator.as.number'].size()!=0 && doc['threat.indicator.as.number'].value!=null) { return emit(doc['threat.indicator.as.number'].value) } }

        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='mac-addr') { if (doc['threat.indicator.mac'].size()!=0 && doc['threat.indicator.mac'].value!=null) { return emit(doc['threat.indicator.mac'].value) } }

        return emit('')"
      `);
    });
  });

  describe('threatIndicatorNamesOriginScript()', () => {
    it('should generate a valid painless script', () => {
      expect(threatIndicatorNamesOriginScript()).toMatchInlineSnapshot(`
        "if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='ipv4-addr') { if (doc['threat.indicator.ip'].size()!=0 && doc['threat.indicator.ip'].value!=null) { return emit('threat.indicator.ip') } }
        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='ipv6-addr') { if (doc['threat.indicator.ip'].size()!=0 && doc['threat.indicator.ip'].value!=null) { return emit('threat.indicator.ip') } }

        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='file') { if (doc['threat.indicator.file.hash.sha256'].size()!=0 && doc['threat.indicator.file.hash.sha256'].value!=null) { return emit('threat.indicator.file.hash.sha256') }
        if (doc['threat.indicator.file.hash.md5'].size()!=0 && doc['threat.indicator.file.hash.md5'].value!=null) { return emit('threat.indicator.file.hash.md5') }
        if (doc['threat.indicator.file.hash.sha1'].size()!=0 && doc['threat.indicator.file.hash.sha1'].value!=null) { return emit('threat.indicator.file.hash.sha1') }
        if (doc['threat.indicator.file.hash.sha224'].size()!=0 && doc['threat.indicator.file.hash.sha224'].value!=null) { return emit('threat.indicator.file.hash.sha224') }
        if (doc['threat.indicator.file.hash.sha3-224'].size()!=0 && doc['threat.indicator.file.hash.sha3-224'].value!=null) { return emit('threat.indicator.file.hash.sha3-224') }
        if (doc['threat.indicator.file.hash.sha3-256'].size()!=0 && doc['threat.indicator.file.hash.sha3-256'].value!=null) { return emit('threat.indicator.file.hash.sha3-256') }
        if (doc['threat.indicator.file.hash.sha384'].size()!=0 && doc['threat.indicator.file.hash.sha384'].value!=null) { return emit('threat.indicator.file.hash.sha384') }
        if (doc['threat.indicator.file.hash.sha3-384'].size()!=0 && doc['threat.indicator.file.hash.sha3-384'].value!=null) { return emit('threat.indicator.file.hash.sha3-384') }
        if (doc['threat.indicator.file.hash.sha512'].size()!=0 && doc['threat.indicator.file.hash.sha512'].value!=null) { return emit('threat.indicator.file.hash.sha512') }
        if (doc['threat.indicator.file.hash.sha3-512'].size()!=0 && doc['threat.indicator.file.hash.sha3-512'].value!=null) { return emit('threat.indicator.file.hash.sha3-512') }
        if (doc['threat.indicator.file.hash.sha512/224'].size()!=0 && doc['threat.indicator.file.hash.sha512/224'].value!=null) { return emit('threat.indicator.file.hash.sha512/224') }
        if (doc['threat.indicator.file.hash.sha512/256'].size()!=0 && doc['threat.indicator.file.hash.sha512/256'].value!=null) { return emit('threat.indicator.file.hash.sha512/256') }
        if (doc['threat.indicator.file.ssdeep'].size()!=0 && doc['threat.indicator.file.ssdeep'].value!=null) { return emit('threat.indicator.file.ssdeep') }
        if (doc['threat.indicator.file.tlsh'].size()!=0 && doc['threat.indicator.file.tlsh'].value!=null) { return emit('threat.indicator.file.tlsh') }
        if (doc['threat.indicator.file.impfuzzy'].size()!=0 && doc['threat.indicator.file.impfuzzy'].value!=null) { return emit('threat.indicator.file.impfuzzy') }
        if (doc['threat.indicator.file.imphash'].size()!=0 && doc['threat.indicator.file.imphash'].value!=null) { return emit('threat.indicator.file.imphash') }
        if (doc['threat.indicator.file.pehash'].size()!=0 && doc['threat.indicator.file.pehash'].value!=null) { return emit('threat.indicator.file.pehash') }
        if (doc['threat.indicator.file.vhash'].size()!=0 && doc['threat.indicator.file.vhash'].value!=null) { return emit('threat.indicator.file.vhash') } }

        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='url') { if (doc['threat.indicator.url.full'].size()!=0 && doc['threat.indicator.url.full'].value!=null) { return emit('threat.indicator.url.full') } }

        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='domain') { if (doc['threat.indicator.url.domain'].size()!=0 && doc['threat.indicator.url.domain'].value!=null) { return emit('threat.indicator.url.domain') } }
        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='domain-name') { if (doc['threat.indicator.url.domain'].size()!=0 && doc['threat.indicator.url.domain'].value!=null) { return emit('threat.indicator.url.domain') } }

        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='x509-certificate') { if (doc['threat.indicator.x509.serial_number'].size()!=0 && doc['threat.indicator.x509.serial_number'].value!=null) { return emit('threat.indicator.x509.serial_number') } }
        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='x509 serial') { if (doc['threat.indicator.x509.serial_number'].size()!=0 && doc['threat.indicator.x509.serial_number'].value!=null) { return emit('threat.indicator.x509.serial_number') } }

        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='email-addr') { if (doc['threat.indicator.email.address'].size()!=0 && doc['threat.indicator.email.address'].value!=null) { return emit('threat.indicator.email.address') } }

        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='unknown') { if (doc['_id'].size()!=0 && doc['_id'].value!=null) { return emit('_id') } }
        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='email') { if (doc['_id'].size()!=0 && doc['_id'].value!=null) { return emit('_id') } }
        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='email-message') { if (doc['_id'].size()!=0 && doc['_id'].value!=null) { return emit('_id') } }

        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='windows-registry-key') { if (doc['threat.indicator.registry.key'].size()!=0 && doc['threat.indicator.registry.key'].value!=null) { return emit('threat.indicator.registry.key') } }

        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='autonomous-system') { if (doc['threat.indicator.as.number'].size()!=0 && doc['threat.indicator.as.number'].value!=null) { return emit('threat.indicator.as.number') } }

        if (doc['threat.indicator.type'].size()!=0 && doc['threat.indicator.type'].value!=null && doc['threat.indicator.type'].value.toLowerCase()=='mac-addr') { if (doc['threat.indicator.mac'].size()!=0 && doc['threat.indicator.mac'].value!=null) { return emit('threat.indicator.mac') } }

        return emit('')"
      `);
    });
  });
});
