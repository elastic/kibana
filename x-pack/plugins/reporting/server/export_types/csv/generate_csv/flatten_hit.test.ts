/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { createFlattenHit } from './flatten_hit';

type Hit = Record<string, any>;

describe('flattenHit', function () {
  let flattenHit: (hit: Hit) => Record<string, string>;
  let hit: Hit;
  let metaFields: string[];

  beforeEach(function () {
    const fields = [
      'tags.text',
      'tags.label',
      'message',
      'geo.coordinates',
      'geo.dest',
      'geo.src',
      'bytes',
      '@timestamp',
      'team',
      'team.name',
      'team.role',
      'user',
      'user.name',
      'user.id',
      'delta',
    ];

    const conflictedFieldTypes = ['user', 'user.id'];

    metaFields = [];

    flattenHit = createFlattenHit(fields, metaFields, conflictedFieldTypes);

    hit = {
      _source: {
        message: 'Hello World',
        geo: {
          coordinates: { lat: 33.45, lon: 112.0667 },
          dest: 'US',
          src: 'IN',
        },
        bytes: 10039103,
        '@timestamp': new Date().toString(),
        tags: [
          { text: 'foo', label: ['FOO1', 'FOO2'] },
          { text: 'bar', label: 'BAR' },
        ],
        groups: ['loners'],
        noMapping: true,
        team: [
          { name: 'foo', role: 'leader' },
          { name: 'bar', role: 'follower' },
          { name: 'baz', role: 'party boy' },
        ],
        user: { name: 'smith', id: 123 },
      },
      fields: {
        delta: [42],
        random: [0.12345],
      },
    };
  });

  it('flattens keys as far down as the mapping goes', function () {
    const flat = flattenHit(hit);

    expect(flat).to.have.property('geo.coordinates', hit._source.geo.coordinates);
    expect(flat).to.not.have.property('geo.coordinates.lat');
    expect(flat).to.not.have.property('geo.coordinates.lon');
    expect(flat).to.have.property('geo.dest', 'US');
    expect(flat).to.have.property('geo.src', 'IN');
    expect(flat).to.have.property('@timestamp', hit._source['@timestamp']);
    expect(flat).to.have.property('message', 'Hello World');
    expect(flat).to.have.property('bytes', 10039103);
  });

  it('flattens keys not in the mapping', function () {
    const flat = flattenHit(hit);

    expect(flat).to.have.property('noMapping', true);
    expect(flat).to.have.property('groups');
    expect(flat.groups).to.eql(['loners']);
  });

  it('flattens conflicting types in the mapping', function () {
    const flat = flattenHit(hit);

    expect(flat).to.not.have.property('user');
    expect(flat).to.have.property('user.name', hit._source.user.name);
    expect(flat).to.have.property('user.id', hit._source.user.id);
  });

  it('should preserve objects in arrays', function () {
    const flat = flattenHit(hit);

    expect(flat).to.have.property('tags', hit._source.tags);
  });

  it('does not enter into nested fields', function () {
    const flat = flattenHit(hit);

    expect(flat).to.have.property('team', hit._source.team);
    expect(flat).to.not.have.property('team.name');
    expect(flat).to.not.have.property('team.role');
    expect(flat).to.not.have.property('team[0]');
    expect(flat).to.not.have.property('team.0');
  });

  it('unwraps script fields', function () {
    const flat = flattenHit(hit);

    expect(flat).to.have.property('delta', 42);
  });

  it('assumes that all fields are "computed fields"', function () {
    const flat = flattenHit(hit);

    expect(flat).to.have.property('random', 0.12345);
  });

  describe('metaFields', function () {
    beforeEach(function () {
      metaFields.push('_metaKey');
    });

    it('ignores fields that start with an _ and are not in the metaFields', function () {
      hit.fields._notMetaKey = [100];
      const flat = flattenHit(hit);
      expect(flat).to.not.have.property('_notMetaKey');
    });

    it('includes underscore-prefixed keys that are in the metaFields', function () {
      hit.fields._metaKey = [100];
      const flat = flattenHit(hit);
      expect(flat).to.have.property('_metaKey', 100);
    });

    it('handles fields that are not arrays, like _timestamp', function () {
      hit.fields._metaKey = 20000;
      const flat = flattenHit(hit);
      expect(flat).to.have.property('_metaKey', 20000);
    });
  });
});
