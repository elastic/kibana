/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../../../../common/ftr_provider_context';
import { ObjectRemover } from '../../../../../../common/lib';

export default function emailTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);

  const getCopyOfAllowedEmailAddresses = () => ['foo.bar@example.org', 'user@test.com'];
  const from = 'sender@domain.co'; // Wouldn't pass recipient_allowlist

  describe('email connector', () => {
    afterEach(() => objectRemover.removeAll());

    it('succeeds with allowed recipients domains', async () => {
      const conn = await createConnector();
      expect(conn.status).to.be(200);

      const { id } = conn.body;
      expect(id).to.be.a('string');

      const to = getCopyOfAllowedEmailAddresses();
      const cc = getCopyOfAllowedEmailAddresses();
      const bcc = getCopyOfAllowedEmailAddresses();

      const ccNames = cc.map((email) => `Jimmy Jack <${email}>`);

      const run = await runConnector(id, to, ccNames, bcc);
      expect(run.status).to.be(200);

      const { status, data } = run.body || {};
      expect(status).to.be('ok');

      const { message } = data || {};
      const { from: fromMsg } = message || {};

      expect(fromMsg?.address).to.be(from);
      expect(addressesFromMessage(message, 'to')).to.eql(to);
      expect(addressesFromMessage(message, 'cc')).to.eql(cc);
      expect(addressesFromMessage(message, 'bcc')).to.eql(bcc);

      const ccNamesMsg = namesFromMessage(message, 'cc');
      for (const ccName of ccNamesMsg) {
        expect(ccName).to.be('Jimmy Jack');
      }
    });

    it('throws when invalid "to", "cc" or "bcc" used', async () => {
      const conn = await createConnector();
      expect(conn.status).to.be(200);

      const { id } = conn.body || {};
      expect(id).to.be.a('string');

      const to = getCopyOfAllowedEmailAddresses();
      const cc = getCopyOfAllowedEmailAddresses();
      const bcc = getCopyOfAllowedEmailAddresses();

      to.push('to.foo@example.org');
      cc.push('invalidcc@domain.co');
      bcc.push('foobar@bcc.org');

      const { status, body } = await runConnector(id, to, cc, bcc);
      expect(status).to.be(200);

      expect(body?.status).to.be('error');
      expect(body?.message).to.match(
        /not allowed emails: to.foo@example.org, invalidcc@domain.co, foobar@bcc.org/
      );
    });
  });

  async function createConnector({
    hasAuth = true,
  }: {
    hasAuth?: boolean;
  } = {}): Promise<{ status: number; body: any }> {
    const connector: any = {
      name: `An email connector from ${__filename}`,
      connector_type_id: '.email',
      config: {
        service: '__json',
        from,
        hasAuth,
      },
    };
    if (hasAuth) {
      connector.secrets = {
        user: 'bob',
        password: 'changeme',
      };
    }
    const { status, body } = await supertest
      .post('/api/actions/connector')
      .set('kbn-xsrf', 'foo')
      .send(connector);

    if (status === 200) {
      objectRemover.add('default', body.id, 'connector', 'actions');
    }

    return { status, body };
  }

  async function runConnector(
    id: string,
    to: string[],
    cc: string[],
    bcc: string[]
  ): Promise<{ status: number; body: any }> {
    const subject = 'email-subject';
    const message = 'email-message';
    const { status, body } = await supertest
      .post(`/api/actions/connector/${id}/_execute`)
      .set('kbn-xsrf', 'foo')
      .send({ params: { to, cc, bcc, subject, message } });

    return { status, body };
  }
}

function addressesFromMessage(message: any, which: 'to' | 'cc' | 'bcc'): string[] {
  return addressFieldFromMessage(message, which, 'address');
}

function namesFromMessage(message: any, which: 'to' | 'cc' | 'bcc'): string[] {
  return addressFieldFromMessage(message, which, 'name');
}

function addressFieldFromMessage(
  message: any,
  which1: 'to' | 'cc' | 'bcc',
  which2: 'name' | 'address'
): string[] {
  const result: string[] = [];

  const list = message?.[which1];
  if (!Array.isArray(list)) return result;

  return list.map((entry) => `${entry?.[which2]}`).sort();
}
