export default (gulp, { multiProcess }) => {
  gulp.task('canvas:dev', done => {
    return multiProcess(['canvas:plugins:dev', 'dev'], done, true);
  });
};
