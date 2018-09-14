export const error = () => ({
  name: 'error',
  to: {
    render: input => {
      const { error, info } = input;
      return {
        type: 'render',
        as: 'error',
        value: {
          error,
          info,
        },
      };
    },
  },
});
