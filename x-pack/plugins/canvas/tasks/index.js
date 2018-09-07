import dev from './dev';
import peg from './peg';
import plugins from './plugins';
import prepare from './prepare';
import test from './test';

export default function canvasTasks(gulp, gulpHelpers) {
  dev(gulp, gulpHelpers);
  peg(gulp, gulpHelpers);
  plugins(gulp, gulpHelpers);
  prepare(gulp, gulpHelpers);
  test(gulp, gulpHelpers);
}
