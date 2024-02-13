/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Output } from '../../../common/types';

import { patchUpdateDataWithRequireEncryptedAADFields } from './so_helpers';

describe('patchUpdateDataWithRequireEncryptedAADFields', () => {
  const ORIGINAL_LOGSTASH_OUTPUT = {
    type: 'logstash',
    allow_edit: ['hosts'],
    ssl: {
      certificate: 'testcertificate',
    },
    secrets: {
      ssl: {
        key: {
          id: 'secretref',
        },
      },
    },
  } as Output;

  const ORIGINAL_KAFKA_OUTPUT = {
    type: 'kafka',
    allow_edit: ['hosts'],
    password: 'testpassword',
    secrets: {
      password: {
        id: 'passwordref',
      },
    },
  } as Output;
  describe('With logstash output', () => {
    describe('when allow_edit is updated', () => {
      it('it should update ssl and secrets field with original ones if no new values are provided', () => {
        const updateData = {
          allow_edit: ['ssl'],
        };

        patchUpdateDataWithRequireEncryptedAADFields(updateData, ORIGINAL_LOGSTASH_OUTPUT);
        expect(updateData).toMatchInlineSnapshot(`
                  Object {
                    "allow_edit": Array [
                      "ssl",
                    ],
                    "secrets": Object {
                      "ssl": Object {
                        "key": Object {
                          "id": "secretref",
                        },
                      },
                    },
                    "ssl": "{\\"certificate\\":\\"testcertificate\\"}",
                  }
              `);
      });

      it('it should update ssl and secrets field with new values if provided', () => {
        const updateData = {
          allow_edit: ['ssl'],
          ssl: JSON.stringify({ certificate: 'testcertificateupdate' }),
          secrets: {
            ssl: {
              key: { id: 'secretupdate' },
            },
          },
        };

        patchUpdateDataWithRequireEncryptedAADFields(updateData, ORIGINAL_LOGSTASH_OUTPUT);
        expect(updateData).toMatchInlineSnapshot(`
                  Object {
                    "allow_edit": Array [
                      "ssl",
                    ],
                    "secrets": Object {
                      "ssl": Object {
                        "key": Object {
                          "id": "secretupdate",
                        },
                      },
                    },
                    "ssl": "{\\"certificate\\":\\"testcertificateupdate\\"}",
                  }
              `);
      });
    });

    describe('when secrets are updated', () => {
      it('it should update ssl and allow_edits field with original ones if no new value is provided', () => {
        const updateData = {
          secrets: {
            ssl: {
              key: { id: 'secretupdate' },
            },
          },
        };

        patchUpdateDataWithRequireEncryptedAADFields(updateData, ORIGINAL_LOGSTASH_OUTPUT);
        expect(updateData).toMatchInlineSnapshot(`
                  Object {
                    "allow_edit": Array [
                      "hosts",
                    ],
                    "secrets": Object {
                      "ssl": Object {
                        "key": Object {
                          "id": "secretupdate",
                        },
                      },
                    },
                    "ssl": "{\\"certificate\\":\\"testcertificate\\"}",
                  }
              `);
      });

      it('it should update ssl and allow_edits field with new values if provided', () => {
        const updateData = {
          allow_edit: ['ssl'],
          ssl: JSON.stringify({ certificate: 'testcertificateupdate' }),
          secrets: {
            ssl: {
              key: { id: 'secretupdate' },
            },
          },
        };

        patchUpdateDataWithRequireEncryptedAADFields(updateData, ORIGINAL_LOGSTASH_OUTPUT);
        expect(updateData).toMatchInlineSnapshot(`
                  Object {
                    "allow_edit": Array [
                      "ssl",
                    ],
                    "secrets": Object {
                      "ssl": Object {
                        "key": Object {
                          "id": "secretupdate",
                        },
                      },
                    },
                    "ssl": "{\\"certificate\\":\\"testcertificateupdate\\"}",
                  }
              `);
      });
    });

    describe('when ssl is updated', () => {
      it('it should update secrets and allow_edits field with original ones if no new value is provided', () => {
        const updateData = {
          ssl: JSON.stringify({
            certificate: 'testcertificateupdate',
          }),
        };

        patchUpdateDataWithRequireEncryptedAADFields(updateData, ORIGINAL_LOGSTASH_OUTPUT);
        expect(updateData).toMatchInlineSnapshot(`
                  Object {
                    "allow_edit": Array [
                      "hosts",
                    ],
                    "secrets": Object {
                      "ssl": Object {
                        "key": Object {
                          "id": "secretref",
                        },
                      },
                    },
                    "ssl": "{\\"certificate\\":\\"testcertificateupdate\\"}",
                  }
              `);
      });

      it('it should update ssl and allow_edits field with new values if provided', () => {
        const updateData = {
          allow_edit: ['ssl'],
          ssl: JSON.stringify({ certificate: 'testcertificateupdate' }),
          secrets: {
            ssl: {
              key: { id: 'secretupdate' },
            },
          },
        };

        patchUpdateDataWithRequireEncryptedAADFields(updateData, ORIGINAL_LOGSTASH_OUTPUT);
        expect(updateData).toMatchInlineSnapshot(`
                  Object {
                    "allow_edit": Array [
                      "ssl",
                    ],
                    "secrets": Object {
                      "ssl": Object {
                        "key": Object {
                          "id": "secretupdate",
                        },
                      },
                    },
                    "ssl": "{\\"certificate\\":\\"testcertificateupdate\\"}",
                  }
              `);
      });
    });
  });

  describe('With kafka output', () => {
    describe('when allow_edit is updated', () => {
      it('it should update password and secrets field with original ones if no new values are provided', () => {
        const updateData = {
          allow_edit: ['password'],
        };

        patchUpdateDataWithRequireEncryptedAADFields(updateData, ORIGINAL_KAFKA_OUTPUT);
        expect(updateData).toMatchInlineSnapshot(`
          Object {
            "allow_edit": Array [
              "password",
            ],
            "password": "testpassword",
            "secrets": Object {
              "password": Object {
                "id": "passwordref",
              },
            },
            "ssl": undefined,
          }
        `);
      });

      it('it should update ssl and secrets field with new values if provided', () => {
        const updateData = {
          allow_edit: ['password'],
          password: 'testupdate',
          secrets: {
            password: { id: 'secretupdate' },
          },
        };

        patchUpdateDataWithRequireEncryptedAADFields(updateData, ORIGINAL_KAFKA_OUTPUT);
        expect(updateData).toMatchInlineSnapshot(`
          Object {
            "allow_edit": Array [
              "password",
            ],
            "password": "testupdate",
            "secrets": Object {
              "password": Object {
                "id": "secretupdate",
              },
            },
            "ssl": undefined,
          }
        `);
      });
    });

    describe('when secrets are updated', () => {
      it('it should update password and allow_edits field with original ones if no new value is provided', () => {
        const updateData = {
          secrets: {
            password: { id: 'secretupdate' },
          },
        };

        patchUpdateDataWithRequireEncryptedAADFields(updateData, ORIGINAL_KAFKA_OUTPUT);
        expect(updateData).toMatchInlineSnapshot(`
          Object {
            "allow_edit": Array [
              "hosts",
            ],
            "password": "testpassword",
            "secrets": Object {
              "password": Object {
                "id": "secretupdate",
              },
            },
            "ssl": undefined,
          }
        `);
      });

      it('it should update password and allow_edits field with new values if provided', () => {
        const updateData = {
          password: 'passwordupdate',
          secrets: {
            password: { id: 'secretupdate' },
          },
        };

        patchUpdateDataWithRequireEncryptedAADFields(updateData, ORIGINAL_KAFKA_OUTPUT);
        expect(updateData).toMatchInlineSnapshot(`
          Object {
            "allow_edit": Array [
              "hosts",
            ],
            "password": "passwordupdate",
            "secrets": Object {
              "password": Object {
                "id": "secretupdate",
              },
            },
            "ssl": undefined,
          }
        `);
      });
    });

    describe('when password is updated', () => {
      it('it should update password and allow_edits field with original ones if no new value is provided', () => {
        const updateData = {
          allow_edit: ['password'],
          password: 'testupdate',
          secrets: {
            password: { id: 'secretupdate' },
          },
        };

        patchUpdateDataWithRequireEncryptedAADFields(updateData, ORIGINAL_KAFKA_OUTPUT);
        expect(updateData).toMatchInlineSnapshot(`
          Object {
            "allow_edit": Array [
              "password",
            ],
            "password": "testupdate",
            "secrets": Object {
              "password": Object {
                "id": "secretupdate",
              },
            },
            "ssl": undefined,
          }
        `);
      });

      it('it should update secrets and allow_edits field with new values if provided', () => {
        const updateData = {
          password: 'passwordupdate',
        };

        patchUpdateDataWithRequireEncryptedAADFields(updateData, ORIGINAL_KAFKA_OUTPUT);
        expect(updateData).toMatchInlineSnapshot(`
          Object {
            "allow_edit": Array [
              "hosts",
            ],
            "password": "passwordupdate",
            "secrets": Object {
              "password": Object {
                "id": "passwordref",
              },
            },
          }
        `);
      });
    });
  });
});
