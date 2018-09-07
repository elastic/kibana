export default gulp => {
  // anything that needs to happen pre-build or pre-dev
  gulp.task('canvas:prepare', ['canvas:plugins:build-prod']);
};
