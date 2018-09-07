import dev from './dev';
// import test from './test';
import peg from './peg';
import plugins from './plugins';
import prepare from './prepare';

export default function canvasTasks(gulp, gulpHelpers) {
  dev(gulp, gulpHelpers);
  // test(gulp, gulpHelpers);
  peg(gulp, gulpHelpers);
  plugins(gulp, gulpHelpers);
  prepare(gulp, gulpHelpers);
}
