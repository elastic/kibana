import { rendezvousHash } from './rendevzous_hash';

test(`two pods`, function () {
  const allPods = ['foo', 'bar'];
  const allPartitions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const fooPartitions = rendezvousHash('foo', allPods, allPartitions, 2);
  expect(fooPartitions).toMatchInlineSnapshot(`
    Array [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
    ]
  `);

  const barPartitions = rendezvousHash('bar', allPods, allPartitions, 2);
  expect(barPartitions).toMatchInlineSnapshot(`
    Array [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      16,
      17,
      18,
      19,
    ]
  `);
});

test(`three pods`, function () {
  const allPods = ['foo', 'bar', 'quz'];
  const allPartitions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const fooPartitions = rendezvousHash('foo', allPods, allPartitions, 2);
  expect(fooPartitions).toMatchInlineSnapshot(`
    Array [
      1,
      3,
      4,
      5,
      6,
      9,
      10,
      11,
      12,
      13,
      14,
      16,
      17,
      18,
      19,
    ]
  `);

  const barPartitions = rendezvousHash('bar', allPods, allPartitions, 2);
  expect(barPartitions).toMatchInlineSnapshot(`
    Array [
      0,
      2,
      5,
      6,
      7,
      8,
      9,
      11,
      12,
      13,
      15,
    ]
  `);

  const quzPartitions = rendezvousHash('quz', allPods, allPartitions, 2);
  expect(quzPartitions).toMatchInlineSnapshot(`
    Array [
      0,
      1,
      2,
      3,
      4,
      7,
      8,
      10,
      14,
      15,
      16,
      17,
      18,
      19,
    ]
  `);
});
