/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fs from 'fs';
import crypto from 'crypto';
import expect from '@kbn/expect';
import { resolve } from 'path';

import { extract } from '../extract';
import { ExtractError } from '../extract_error';
import { promisify } from 'util';

const FIXTURES_FOLDER = resolve(__dirname, '__fixtures__');
const SRC_FILE_UNCOMPRESSED = resolve(FIXTURES_FOLDER, 'file.md');
const SRC_FILE_COMPRESSED_ZIP = `${SRC_FILE_UNCOMPRESSED}.zip`;
const EXTRACT_TARGET_FOLDER = resolve(FIXTURES_FOLDER, 'extract_target');
const EXTRACT_TARGET_FILE = resolve(EXTRACT_TARGET_FOLDER, 'file.md');

const fsp = {
  mkdir: promisify(fs.mkdir),
  rmdir: promisify(fs.rmdir),
  unlink: promisify(fs.unlink)
};

const ignoreErrorCodes = async (codes, promise) => {
  try {
    await promise;
  } catch (err) {
    if (!codes.includes(err.code)) {
      throw err;
    }
  }
};

async function cleanup() {
  await ignoreErrorCodes(['ENOENT', 'EACCES'], fsp.unlink(EXTRACT_TARGET_FILE));
  await ignoreErrorCodes(['ENOENT'], fsp.rmdir(EXTRACT_TARGET_FOLDER));
}

function fileHash(filepath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const input = fs.createReadStream(filepath);
    input.on('readable', () => {
      const data = input.read();
      if (data) {
        hash.update(data);
      } else {
        resolve(hash.digest('hex'));
      }
    });
    input.on('error', reject);
  });
}

describe('extract', () => {

  beforeEach(cleanup);
  afterEach(cleanup);

  const isWindows = /^win/.test(process.platform);

  describe('zip()', () => {
    it('throws an Error given a non-zip file', async () => {
      let thrownException;
      try {
        await extract(SRC_FILE_UNCOMPRESSED, EXTRACT_TARGET_FOLDER);
      } catch (e) {
        thrownException = e;
      }

      expect(thrownException).to.be.an(ExtractError);
    });

    it('successfully extracts a valid zip file to the given target', async () => {
      await extract(SRC_FILE_COMPRESSED_ZIP, EXTRACT_TARGET_FOLDER);

      const stats = fs.statSync(EXTRACT_TARGET_FILE);
      expect(stats).to.be.an(Object);

      const srcFileHash = await fileHash(SRC_FILE_UNCOMPRESSED);
      const targetFileHash = await fileHash(EXTRACT_TARGET_FILE);
      expect(targetFileHash).to.eql(srcFileHash);
    });

    if (isWindows) {
      it(`Windows doesn't support chmod, so it's missing access tests. Windows is throwing EEXIST.`);
    } else {
      it(`throws an ExtractError with cause.code of EACESS when target is un-writeable`, async () => {
        await fsp.mkdir(EXTRACT_TARGET_FOLDER, 0o444);

        let thrownException;
        try {
          await extract(SRC_FILE_COMPRESSED_ZIP, EXTRACT_TARGET_FOLDER);
        } catch (e) {
          thrownException = e;
        }

        expect(thrownException).to.be.an(ExtractError);
        expect(thrownException.cause.code).to.eql('EACCES');
      });
    }
  });
});
