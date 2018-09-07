import { resolve } from 'path';

const grammarDir = resolve(__dirname, '..', 'common', 'lib');

export default function pegTask(gulp, { pegjs }) {
  gulp.task('canvas:peg:build', function() {
    return gulp
      .src(`${grammarDir}/*.peg`)
      .pipe(
        pegjs({
          format: 'commonjs',
          allowedStartRules: ['expression', 'argument'],
        })
      )
      .pipe(gulp.dest(grammarDir));
  });

  gulp.task('canvas:peg:dev', function() {
    gulp.watch(`${grammarDir}/*.peg`, ['peg']);
  });
}
