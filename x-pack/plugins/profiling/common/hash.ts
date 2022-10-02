/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// prettier-ignore
const lowerHex = [
  '00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '0a', '0b', '0c', '0d', '0e', '0f',
  '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '1a', '1b', '1c', '1d', '1e', '1f',
  '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '2a', '2b', '2c', '2d', '2e', '2f',
  '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '3a', '3b', '3c', '3d', '3e', '3f',
  '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '4a', '4b', '4c', '4d', '4e', '4f',
  '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '5a', '5b', '5c', '5d', '5e', '5f',
  '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '6a', '6b', '6c', '6d', '6e', '6f',
  '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '7a', '7b', '7c', '7d', '7e', '7f',
  '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '8a', '8b', '8c', '8d', '8e', '8f',
  '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '9a', '9b', '9c', '9d', '9e', '9f',
  'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'aa', 'ab', 'ac', 'ad', 'ae', 'af',
  'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'ba', 'bb', 'bc', 'bd', 'be', 'bf',
  'c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'ca', 'cb', 'cc', 'cd', 'ce', 'cf',
  'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'da', 'db', 'dc', 'dd', 'de', 'df',
  'e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'ea', 'eb', 'ec', 'ed', 'ee', 'ef',
  'f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'fa', 'fb', 'fc', 'fd', 'fe', 'ff',
];

// fnv1a64 computes a 64-bit hash of a byte array using the FNV-1a hash function [1].
//
// Due to the lack of a native uint64 in JavaScript, we operate on 64-bit values using an array
// of 4 uint16s instead. This method follows Knuth's Algorithm M in section 4.3.1 [2] using a
// modified multiword multiplication implementation described in [3]. The modifications include:
//
// * rewrite default algorithm for the special case m = n = 4
// * unroll loops
// * simplify expressions
// * create pre-computed lookup table for serialization to hexadecimal
//
// 1. https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function
// 2. Knuth, Donald E. The Art of Computer Programming, Volume 2, Third Edition: Seminumerical
//      Algorithms. Addison-Wesley, 1998.
// 3. Warren, Henry S. Hacker's Delight. Upper Saddle River, NJ: Addison-Wesley, 2013.

/* eslint no-bitwise: ["error", { "allow": ["^=", ">>", "&"] }] */
export function fnv1a64(bytes: Uint8Array): string {
  const n = bytes.length;
  let [h0, h1, h2, h3] = [0x2325, 0x8422, 0x9ce4, 0xcbf2];
  let [t0, t1, t2, t3] = [0, 0, 0, 0];

  for (let i = 0; i < n; i++) {
    h0 ^= bytes[i];

    t0 = h0 * 0x01b3;
    t1 = h1 * 0x01b3;
    t2 = h2 * 0x01b3;
    t3 = h3 * 0x01b3;

    t1 += t0 >> 16;
    t2 += t1 >> 16;
    t2 += h0 * 0x0100;
    t3 += h1 * 0x0100;

    h0 = t0 & 0xffff;
    h1 = t1 & 0xffff;
    h2 = t2 & 0xffff;
    h3 = (t3 + (t2 >> 16)) & 0xffff;
  }

  return (
    lowerHex[h3 >> 8] +
    lowerHex[h3 & 0xff] +
    lowerHex[h2 >> 8] +
    lowerHex[h2 & 0xff] +
    lowerHex[h1 >> 8] +
    lowerHex[h1 & 0xff] +
    lowerHex[h0 >> 8] +
    lowerHex[h0 & 0xff]
  );
}
