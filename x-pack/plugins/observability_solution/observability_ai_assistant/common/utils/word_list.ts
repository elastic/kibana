/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniq } from 'lodash';

export const WORD_LIST = uniq([
  'cat',
  'dog',
  'fish',
  'jump',
  'run',
  'play',
  'stern',
  'free',
  'tree',
  'lamp',
  'chair',
  'table',
  'house',
  'car',
  'plane',
  'train',
  'boat',
  'bike',
  'bird',
  'milk',
  'bread',
  'water',
  'light',
  'dark',
  'fast',
  'slow',
  'soft',
  'hard',
  'cold',
  'hot',
  'warm',
  'cool',
  'wind',
  'fire',
  'earth',
  'stone',
  'metal',
  'glass',
  'wood',
  'paper',
  'book',
  'pen',
  'pencil',
  'fruit',
  'berry',
  'apple',
  'grape',
  'lemon',
  'lime',
  'peach',
  'plum',
  'pear',
  'rice',
  'wheat',
  'corn',
  'bean',
  'salt',
  'sugar',
  'flour',
  'butter',
  'cream',
  'cheese',
  'yogurt',
  'meat',
  'pork',
  'beef',
  'lamb',
  'goat',
  'duck',
  'chicken',
  'turkey',
  'bacon',
  'ham',
  'egg',
  'cake',
  'pie',
  'pasta',
  'soup',
  'stew',
  'sauce',
  'drink',
  'juice',
  'soda',
  'tea',
  'coffee',
  'snack',
  'chips',
  'cookie',
  'cracker',
  'nut',
  'seed',
  'date',
  'fig',
  'kiwi',
  'mango',
  'melon',
  'orange',
  'noodles',
  'spice',
  'herb',
  'oil',
  'lard',
  'pea',
  'lentil',
  'barley',
  'oats',
  'rye',
  'soy',
  'quinoa',
  'teff',
  'amaranth',
  'cane',
  'beet',
  'syrup',
  'honey',
  'jam',
  'jelly',
  'preserve',
  'bun',
  'roll',
  'loaf',
  'bagel',
  'toast',
  'biscuit',
  'scone',
  'muffin',
  'donut',
  'bar',
  'brownie',
  'fudge',
  'candy',
  'sweet',
  'pudding',
  'custard',
  'frosting',
  'icing',
  'spread',
  'paste',
  'kefir',
  'curd',
  'whey',
  'casein',
  'venison',
  'goose',
  'quail',
  'pheasant',
  'crab',
  'lobster',
  'shrimp',
  'oyster',
  'clam',
  'mussel',
  'squid',
  'octopus',
  'algae',
  'kelp',
  'seaweed',
  'plankton',
  'coral',
  'sponge',
  'urchin',
  'starfish',
  'prawn',
  'snail',
  'slug',
  'worm',
  'bug',
  'ant',
  'bee',
  'wasp',
  'fly',
  'moth',
  'beetle',
  'gnat',
  'tick',
  'mite',
  'flea',
  'lice',
  'louse',
  'spider',
  'scorpion',
]);

export class WordIdList {
  private index: number = 0;
  private readonly list = WORD_LIST.concat();
  private byWord: Map<string, string> = new Map();
  private byOriginalId: Map<string, string> = new Map();
  constructor() {}

  take(originalId: string) {
    if (this.byOriginalId.has(originalId)) {
      return this.byOriginalId.get(originalId)!;
    }

    const list = this.list;
    const rotations = Math.ceil((this.index + 1) / list.length);

    const words: string[] = [];
    let takeAt = this.index;
    while (words.length < rotations) {
      const indexNormalized = takeAt % list.length;
      words.push(list[indexNormalized]);
      takeAt += 1;
    }

    this.index += 1;

    const word = words.join('');

    this.byWord.set(word, originalId);

    this.byOriginalId.set(originalId, word);

    return word;
  }

  lookup(wordId: string) {
    return this.byWord.get(wordId);
  }

  public get length() {
    return this.list.length;
  }
}
